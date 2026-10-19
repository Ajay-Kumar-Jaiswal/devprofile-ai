import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import httpx
from fastapi import HTTPException, status

from app.config import settings
from app.models import (
    UserProfile,
    RepositoryItem,
    LanguageStat,
    AggregateStats,
    RepoQualityChecklist,
)

# GitHub username validation regex:
# Alphanumeric characters or single hyphens, 1-39 chars, cannot begin or end with hyphen
GITHUB_USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$")


@dataclass
class CachedUserData:
    """In-memory cache entry for retrieved GitHub profile and repository metadata."""
    raw_profile: Dict[str, Any]
    raw_repos: List[Dict[str, Any]]
    readme_excerpts: Dict[str, str] = field(default_factory=dict)
    cached_at: float = field(default_factory=time.time)

    def is_expired(self, ttl_seconds: int) -> bool:
        return (time.time() - self.cached_at) > ttl_seconds


class GitHubService:
    """Service to interact with the GitHub REST API asynchronously with rate-limit protection and caching."""

    def __init__(self):
        self.base_url = settings.GITHUB_API_BASE_URL.rstrip("/")
        self.timeout = settings.REQUEST_TIMEOUT_SECONDS
        self._cache: Dict[str, CachedUserData] = {}
        self._rate_limit_reset_epoch: Optional[int] = None

    @property
    def token(self) -> Optional[str]:
        """Dynamically retrieves GITHUB_TOKEN from the environment or settings."""
        raw = os.getenv("GITHUB_TOKEN") or settings.GITHUB_TOKEN
        if raw and raw.strip():
            return raw.strip()
        return None

    @token.setter
    def token(self, value: Optional[str]) -> None:
        """Sets or unsets GITHUB_TOKEN in environment and settings."""
        if value is None:
            os.environ.pop("GITHUB_TOKEN", None)
            settings.GITHUB_TOKEN = None
        else:
            os.environ["GITHUB_TOKEN"] = value
            settings.GITHUB_TOKEN = value

    def _get_headers(self) -> Dict[str, str]:
        """Generates standard GitHub REST API request headers."""
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "DevProfile-AI-Analyzer",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        tok = self.token
        if tok:
            # Handle user tokens whether formatted with prefix or bare token
            if tok.lower().startswith("bearer "):
                headers["Authorization"] = tok
            elif tok.lower().startswith("token "):
                headers["Authorization"] = f"Bearer {tok[6:].strip()}"
            else:
                headers["Authorization"] = f"Bearer {tok}"
        return headers

    def get_cached_user(self, username: str) -> Optional[CachedUserData]:
        """Retrieves cached GitHub user data if still within TTL."""
        key = username.strip().lower()
        cached = self._cache.get(key)
        if not cached:
            return None
        if cached.is_expired(settings.GITHUB_CACHE_TTL_SECONDS):
            del self._cache[key]
            return None
        return cached

    def set_cached_user(
        self,
        username: str,
        raw_profile: Dict[str, Any],
        raw_repos: List[Dict[str, Any]],
        readme_excerpts: Optional[Dict[str, str]] = None,
    ) -> None:
        """Caches raw user data with the current timestamp."""
        key = username.strip().lower()
        self._cache[key] = CachedUserData(
            raw_profile=raw_profile,
            raw_repos=raw_repos,
            readme_excerpts=readme_excerpts or {},
            cached_at=time.time(),
        )

    def clear_cache(self) -> None:
        """Clears all entries in the in-memory cache."""
        self._cache.clear()

    def _check_rate_limit_lockout(self) -> None:
        """Fast-fails without generating HTTP traffic if the rate limit is currently exhausted."""
        if self._rate_limit_reset_epoch is not None:
            now = time.time()
            if now < self._rate_limit_reset_epoch:
                wait_seconds = max(1, int(self._rate_limit_reset_epoch - now))
                reset_dt = datetime.fromtimestamp(self._rate_limit_reset_epoch, tz=timezone.utc)
                reset_str = reset_dt.strftime("%H:%M:%S UTC")
                minutes, seconds = divmod(wait_seconds, 60)
                countdown = f"{minutes}m {seconds}s" if minutes else f"{seconds}s"

                if self.token:
                    detail = (
                        f"GitHub API rate limit is currently exhausted for your configured token. "
                        f"Quota resets in {countdown} at {reset_str}. "
                        "Requests are paused until quota resets to prevent rate-limit penalties. "
                        "You can test immediately using the offline demo profile."
                    )
                else:
                    detail = (
                        f"GitHub API unauthenticated rate limit is exhausted (60 req/hr). "
                        f"Quota resets in {countdown} at {reset_str}. "
                        "Add a GITHUB_TOKEN to backend/.env for up to 5,000 requests/hour, "
                        "or click 'Load Demo Profile' to continue immediately."
                    )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=detail,
                )
            else:
                # Lockout duration has expired
                self._rate_limit_reset_epoch = None

    def _handle_rate_limit(self, resp: httpx.Response) -> None:
        """Parses rate-limit headers (reset, remaining, limit, retry-after) and raises a helpful 429."""
        reset_header = resp.headers.get("x-ratelimit-reset")
        retry_after = resp.headers.get("retry-after")
        limit = resp.headers.get("x-ratelimit-limit")

        now = time.time()
        if reset_header:
            try:
                reset_epoch = int(reset_header)
            except (ValueError, TypeError):
                reset_epoch = int(now + 60)
        elif retry_after:
            try:
                reset_epoch = int(now + int(retry_after))
            except (ValueError, TypeError):
                reset_epoch = int(now + 60)
        else:
            reset_epoch = int(now + 60)

        self._rate_limit_reset_epoch = reset_epoch
        wait_seconds = max(1, int(reset_epoch - now))
        reset_dt = datetime.fromtimestamp(reset_epoch, tz=timezone.utc)
        reset_str = reset_dt.strftime("%H:%M:%S UTC")
        minutes, seconds = divmod(wait_seconds, 60)
        countdown = f"{minutes}m {seconds}s" if minutes else f"{seconds}s"

        if self.token:
            limit_desc = f"{limit} req/hr" if limit else "5,000 req/hr"
            detail = (
                f"GitHub API rate limit exceeded for your authenticated token ({limit_desc}). "
                f"Quota resets in {countdown} at {reset_str}. "
                "Please wait for quota reset or test using the offline demo profile."
            )
        else:
            limit_desc = f"{limit} req/hr" if limit else "60 req/hr"
            detail = (
                f"GitHub API unauthenticated rate limit exceeded ({limit_desc}). "
                f"Quota resets in {countdown} at {reset_str}. "
                "Add a free personal access token to GITHUB_TOKEN in backend/.env for up to 5,000 requests/hour, "
                "or click 'Load Demo Profile' to continue immediately."
            )

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
        )

    def validate_username(self, username: str) -> str:
        """Validates that the username conforms to GitHub naming standards."""
        cleaned = username.strip()
        if not cleaned:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GitHub username cannot be empty.",
            )
        if not GITHUB_USERNAME_REGEX.match(cleaned):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"'{cleaned}' is not a valid GitHub username. "
                    "GitHub usernames can only contain alphanumeric characters or single hyphens, "
                    "must be between 1 and 39 characters, and cannot begin or end with a hyphen."
                ),
            )
        return cleaned

    async def fetch_profile(self, client: httpx.AsyncClient, username: str) -> Dict[str, Any]:
        """Fetches public user profile information with rate limit protection."""
        self._check_rate_limit_lockout()

        url = f"{self.base_url}/users/{username}"
        try:
            resp = await client.get(url, headers=self._get_headers(), timeout=self.timeout)
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"GitHub API connection timed out while querying user '{username}'. Please try again.",
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Network error communicating with GitHub API: {str(exc)}",
            )

        if resp.status_code == 429:
            self._handle_rate_limit(resp)
        elif resp.status_code == 403:
            is_rate_limit = (
                resp.headers.get("x-ratelimit-remaining") == "0"
                or "rate limit" in resp.text.lower()
                or "secondary rate limit" in resp.text.lower()
                or bool(resp.headers.get("retry-after"))
            )
            if is_rate_limit:
                self._handle_rate_limit(resp)
            elif "bad credentials" in resp.text.lower():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid GitHub personal access token configured in backend/.env. Please verify or update GITHUB_TOKEN.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="GitHub API access forbidden for this request.",
                )
        elif resp.status_code == 401:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid GitHub personal access token configured in backend/.env. Please verify or update GITHUB_TOKEN.",
            )
        elif resp.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"GitHub user '{username}' was not found. Please verify the handle.",
            )
        elif resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"GitHub API returned error {resp.status_code}: {resp.text}",
            )

        return resp.json()

    async def fetch_repositories(
        self,
        client: httpx.AsyncClient,
        username: str,
        max_repos: int = 100,
        public_repos_count: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Fetches public repositories with pagination up to max_repos or public_repos_count."""
        self._check_rate_limit_lockout()

        if public_repos_count is not None and public_repos_count <= 0:
            return []

        target_count = min(max_repos, public_repos_count) if public_repos_count is not None else max_repos
        all_repos: List[Dict[str, Any]] = []
        page = 1
        per_page = min(target_count, 100)

        while len(all_repos) < target_count:
            url = f"{self.base_url}/users/{username}/repos"
            params = {
                "per_page": per_page,
                "page": page,
                "sort": "updated",
                "type": "public",
            }
            try:
                resp = await client.get(
                    url, params=params, headers=self._get_headers(), timeout=self.timeout
                )
            except httpx.TimeoutException:
                # If subsequent pages time out, proceed with what we have
                if all_repos:
                    break
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=f"GitHub API connection timed out while querying repositories for '{username}'.",
                )
            except httpx.RequestError as exc:
                if all_repos:
                    break
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Network error querying repositories: {str(exc)}",
                )

            if resp.status_code == 429:
                if all_repos:
                    break
                self._handle_rate_limit(resp)
            elif resp.status_code == 403:
                is_rate_limit = (
                    resp.headers.get("x-ratelimit-remaining") == "0"
                    or "rate limit" in resp.text.lower()
                    or "secondary rate limit" in resp.text.lower()
                    or bool(resp.headers.get("retry-after"))
                )
                if is_rate_limit:
                    if all_repos:
                        break
                    self._handle_rate_limit(resp)
                if all_repos:
                    break
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="GitHub API access forbidden during repository fetch.",
                )
            elif resp.status_code != 200:
                if all_repos:
                    break
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"GitHub API returned error {resp.status_code} during repository fetch.",
                )

            page_data = resp.json()
            if not isinstance(page_data, list) or len(page_data) == 0:
                break

            all_repos.extend(page_data)
            if len(page_data) < per_page or len(all_repos) >= target_count:
                break
            page += 1

        return all_repos[:max_repos]

    async def fetch_readme_excerpt(
        self, client: httpx.AsyncClient, owner: str, repo: str, max_chars: int = 800
    ) -> Optional[str]:
        """Safely fetches a short excerpt of repository README if available."""
        # If rate limit lockout is active, skip README fetch quietly without hitting network
        if self._rate_limit_reset_epoch is not None and time.time() < self._rate_limit_reset_epoch:
            return None

        url = f"{self.base_url}/repos/{owner}/{repo}/readme"
        headers = self._get_headers()
        headers["Accept"] = "application/vnd.github.raw+json"
        try:
            resp = await client.get(url, headers=headers, timeout=4.0)
            if resp.status_code == 200:
                text = resp.text.strip()
                cleaned = " ".join(text.split())
                return cleaned[:max_chars]
            elif resp.status_code in (403, 429):
                # Check if rate limit was hit
                if resp.headers.get("x-ratelimit-remaining") == "0" or resp.status_code == 429:
                    reset_h = resp.headers.get("x-ratelimit-reset")
                    if reset_h:
                        try:
                            self._rate_limit_reset_epoch = int(reset_h)
                        except (ValueError, TypeError):
                            pass
                return None
        except Exception:
            return None
        return None

    def parse_profile(self, raw: Dict[str, Any]) -> UserProfile:
        """Parses and normalizes raw GitHub user payload into UserProfile model."""
        created_at_str = raw.get("created_at")
        account_age_years = None
        if created_at_str:
            try:
                created_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                now = datetime.now(timezone.utc)
                account_age_years = round((now - created_dt).days / 365.25, 2)
            except Exception:
                account_age_years = None

        return UserProfile(
            login=raw.get("login", ""),
            name=raw.get("name"),
            avatar_url=raw.get("avatar_url", ""),
            html_url=raw.get("html_url", f"https://github.com/{raw.get('login', '')}"),
            bio=raw.get("bio"),
            company=raw.get("company"),
            location=raw.get("location"),
            blog=raw.get("blog"),
            twitter_username=raw.get("twitter_username"),
            public_repos=raw.get("public_repos", 0),
            public_gists=raw.get("public_gists", 0),
            followers=raw.get("followers", 0),
            following=raw.get("following", 0),
            created_at=raw.get("created_at"),
            updated_at=raw.get("updated_at"),
            account_age_years=account_age_years,
        )

    def parse_repositories(self, raw_repos: List[Dict[str, Any]]) -> List[RepositoryItem]:
        """Parses raw repository objects into validated RepositoryItem models."""
        now = datetime.now(timezone.utc)
        items: List[RepositoryItem] = []

        for repo in raw_repos:
            pushed_at_str = repo.get("pushed_at")
            days_since_push = None
            if pushed_at_str:
                try:
                    pushed_dt = datetime.fromisoformat(pushed_at_str.replace("Z", "+00:00"))
                    days_since_push = max(0, (now - pushed_dt).days)
                except Exception:
                    days_since_push = None

            topics = repo.get("topics", [])
            description = repo.get("description")
            has_desc = bool(description and description.strip())
            has_topics = bool(topics and len(topics) > 0)

            license_obj = repo.get("license")
            has_license = bool(license_obj and license_obj.get("key"))
            license_name = license_obj.get("name") if license_obj else None

            # Calculate individual repo quality indicator (0-100)
            score = 20  # Base for having a repo
            if has_desc:
                score += 25
            if has_topics:
                score += 20
            if has_license:
                score += 20
            if days_since_push is not None and days_since_push <= 180:
                score += 15
            score = min(100, score)

            items.append(
                RepositoryItem(
                    id=repo.get("id", 0),
                    name=repo.get("name", "untitled"),
                    full_name=repo.get("full_name", repo.get("name", "untitled")),
                    description=description,
                    html_url=repo.get("html_url", ""),
                    language=repo.get("language"),
                    stargazers_count=repo.get("stargazers_count", 0),
                    forks_count=repo.get("forks_count", 0),
                    open_issues_count=repo.get("open_issues_count", 0),
                    watchers_count=repo.get("watchers_count", 0),
                    has_readme=True,  # Documented assumption where accessible
                    has_description=has_desc,
                    has_topics=has_topics,
                    has_license=has_license,
                    license_name=license_name,
                    topics=topics,
                    is_fork=bool(repo.get("fork", False)),
                    created_at=repo.get("created_at", ""),
                    updated_at=repo.get("updated_at", ""),
                    pushed_at=pushed_at_str,
                    days_since_last_push=days_since_push,
                    quality_score=score,
                )
            )

        # Sort repos by stars descending, then forks
        items.sort(key=lambda r: (r.stargazers_count, r.forks_count), reverse=True)
        return items

    def compute_aggregates(
        self, profile: UserProfile, repos: List[RepositoryItem]
    ) -> Tuple[AggregateStats, List[LanguageStat], RepoQualityChecklist]:
        """Calculates summary statistics, language breakdown, and quality checklist."""
        total_stars = sum(r.stargazers_count for r in repos)
        total_forks = sum(r.forks_count for r in repos)
        total_open_issues = sum(r.open_issues_count for r in repos)
        total_analyzed = len(repos)

        # Language distribution
        lang_counts: Dict[str, int] = {}
        for r in repos:
            if r.language and r.language.strip():
                lang = r.language.strip()
                lang_counts[lang] = lang_counts.get(lang, 0) + 1

        total_lang_repos = sum(lang_counts.values()) or 1
        languages: List[LanguageStat] = []

        # Color mapping for common programming languages
        lang_colors: Dict[str, str] = {
            "TypeScript": "#3178c6",
            "JavaScript": "#f7df1e",
            "Python": "#3572A5",
            "Java": "#b07219",
            "C++": "#f34b7d",
            "C#": "#178600",
            "C": "#555555",
            "Go": "#00ADD8",
            "Rust": "#dea584",
            "Ruby": "#701516",
            "PHP": "#4F5D95",
            "Swift": "#F05138",
            "Kotlin": "#A97BFF",
            "Dart": "#00B4AB",
            "HTML": "#e34c26",
            "CSS": "#563d7c",
            "Shell": "#89e051",
            "Vue": "#41b883",
        }

        for lang, count in sorted(lang_counts.items(), key=lambda x: x[1], reverse=True):
            pct = round((count / total_lang_repos) * 100, 1)
            languages.append(
                LanguageStat(
                    language=lang,
                    repo_count=count,
                    percentage=pct,
                    color=lang_colors.get(lang, "#8b5cf6"),
                )
            )

        primary_language = languages[0].language if languages else None
        avg_stars = round(total_stars / max(1, total_analyzed), 2)

        stats = AggregateStats(
            total_stars=total_stars,
            total_forks=total_forks,
            total_public_repos=profile.public_repos,
            total_analyzed_repos=total_analyzed,
            detected_languages_count=len(languages),
            primary_language=primary_language,
            average_stars_per_repo=avg_stars,
            total_open_issues=total_open_issues,
        )

        # Quality checklist computation
        original_repos = [r for r in repos if not r.is_fork]
        forked_repos = [r for r in repos if r.is_fork]

        desc_count = sum(1 for r in repos if r.has_description)
        topics_count = sum(1 for r in repos if r.has_topics)
        license_count = sum(1 for r in repos if r.has_license)
        active_6m_count = sum(
            1 for r in repos if r.days_since_last_push is not None and r.days_since_last_push <= 180
        )

        denominator = max(1, total_analyzed)
        checklist = RepoQualityChecklist(
            total_repos_analyzed=total_analyzed,
            repos_with_description=desc_count,
            repos_with_description_pct=round((desc_count / denominator) * 100, 1),
            repos_with_topics=topics_count,
            repos_with_topics_pct=round((topics_count / denominator) * 100, 1),
            repos_with_license=license_count,
            repos_with_license_pct=round((license_count / denominator) * 100, 1),
            repos_active_within_6_months=active_6m_count,
            repos_active_within_6_months_pct=round((active_6m_count / denominator) * 100, 1),
            original_repos_count=len(original_repos),
            forked_repos_count=len(forked_repos),
        )

        return stats, languages, checklist

    def get_sample_demo_profile(self) -> Tuple[UserProfile, List[RepositoryItem]]:
        """
        Returns a clearly labeled mock demonstration profile.
        Ensures a guaranteed demo experience during college placement drive presentations.
        """
        demo_profile = UserProfile(
            login="alex-dev-demo",
            name="Alex Rivera",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
            html_url="https://github.com/demo/alex-dev-demo",
            bio="CS Undergrad @ Tech Institute | Full-stack enthusiast passionate about distributed systems & AI tooling.",
            company="Tech Innovators Lab",
            location="Bangalore, India",
            blog="https://alexrivera.dev",
            twitter_username="alexrivera_dev",
            public_repos=14,
            public_gists=2,
            followers=48,
            following=31,
            created_at="2022-08-15T10:00:00Z",
            updated_at="2026-10-10T14:30:00Z",
            account_age_years=4.15,
        )

        demo_repos = [
            RepositoryItem(
                id=101,
                name="cloud-flow-engine",
                full_name="alex-dev-demo/cloud-flow-engine",
                description="High-performance async workflow orchestrator built with FastAPI, Redis, and Celery.",
                html_url="https://github.com/demo/cloud-flow-engine",
                language="Python",
                stargazers_count=86,
                forks_count=19,
                open_issues_count=3,
                watchers_count=86,
                has_readme=True,
                has_description=True,
                has_topics=True,
                has_license=True,
                license_name="MIT License",
                topics=["fastapi", "asyncio", "redis", "workflow-engine", "distributed-systems"],
                is_fork=False,
                created_at="2023-02-10T12:00:00Z",
                updated_at="2026-10-01T15:20:00Z",
                pushed_at="2026-10-01T15:20:00Z",
                days_since_last_push=18,
                quality_score=95,
            ),
            RepositoryItem(
                id=102,
                name="dev-insight-dashboard",
                full_name="alex-dev-demo/dev-insight-dashboard",
                description="Interactive telemetry analytics dashboard with real-time websocket metrics & charts.",
                html_url="https://github.com/demo/dev-insight-dashboard",
                language="TypeScript",
                stargazers_count=44,
                forks_count=8,
                open_issues_count=1,
                watchers_count=44,
                has_readme=True,
                has_description=True,
                has_topics=True,
                has_license=True,
                license_name="MIT License",
                topics=["react", "typescript", "tailwindcss", "websockets", "recharts"],
                is_fork=False,
                created_at="2023-09-14T09:30:00Z",
                updated_at="2026-09-20T11:15:00Z",
                pushed_at="2026-09-20T11:15:00Z",
                days_since_last_push=29,
                quality_score=90,
            ),
            RepositoryItem(
                id=103,
                name="smart-cache-kv",
                full_name="alex-dev-demo/smart-cache-kv",
                description="Lightweight in-memory LRU key-value store with TTL expiration implemented in Go.",
                html_url="https://github.com/demo/smart-cache-kv",
                language="Go",
                stargazers_count=23,
                forks_count=4,
                open_issues_count=0,
                watchers_count=23,
                has_readme=True,
                has_description=True,
                has_topics=True,
                has_license=True,
                license_name="Apache-2.0",
                topics=["go", "cache", "lru-cache", "concurrency"],
                is_fork=False,
                created_at="2024-03-05T14:10:00Z",
                updated_at="2026-08-15T08:00:00Z",
                pushed_at="2026-08-15T08:00:00Z",
                days_since_last_push=65,
                quality_score=85,
            ),
            RepositoryItem(
                id=104,
                name="algorithm-vault",
                full_name="alex-dev-demo/algorithm-vault",
                description="Curated collection of clean algorithmic problem solutions in Python & C++.",
                html_url="https://github.com/demo/algorithm-vault",
                language="Python",
                stargazers_count=12,
                forks_count=3,
                open_issues_count=0,
                watchers_count=12,
                has_readme=True,
                has_description=True,
                has_topics=False,
                has_license=False,
                license_name=None,
                topics=[],
                is_fork=False,
                created_at="2022-11-20T17:45:00Z",
                updated_at="2026-07-10T19:00:00Z",
                pushed_at="2026-07-10T19:00:00Z",
                days_since_last_push=101,
                quality_score=60,
            ),
            RepositoryItem(
                id=105,
                name="coursework-compiler-lab",
                full_name="alex-dev-demo/coursework-compiler-lab",
                description=None,  # Intentionally missing description to demonstrate audit
                html_url="https://github.com/demo/coursework-compiler-lab",
                language="C++",
                stargazers_count=4,
                forks_count=1,
                open_issues_count=0,
                watchers_count=4,
                has_readme=True,
                has_description=False,
                has_topics=False,
                has_license=False,
                license_name=None,
                topics=[],
                is_fork=False,
                created_at="2023-01-18T16:00:00Z",
                updated_at="2024-05-12T10:00:00Z",
                pushed_at="2024-05-12T10:00:00Z",
                days_since_last_push=520,
                quality_score=40,
            ),
        ]

        return demo_profile, demo_repos


github_service = GitHubService()
