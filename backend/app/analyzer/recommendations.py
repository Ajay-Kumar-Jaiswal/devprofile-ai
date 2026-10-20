import re
from typing import List, Optional, Tuple
from urllib.parse import urlparse
from app.models import (
    UserProfile,
    RepositoryItem,
    LanguageStat,
    RepoQualityChecklist,
    RecommendationItem,
    RoadmapPhase,
    RoadmapStep,
)


def extract_urls(text: Optional[str]) -> List[str]:
    """Extracts URL strings or domain-like links from free-form text or bio."""
    if not text:
        return []
    pattern = r'(?:https?://[^\s,;]+|(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s,;]*)?)'
    matches = re.findall(pattern, text)
    return [m.strip().rstrip('.,;:)') for m in matches if m.strip()]


def normalize_url(raw: str) -> str:
    """Normalizes URL for consistent destination comparison."""
    cleaned = raw.strip()
    if not cleaned.startswith(("http://", "https://")):
        cleaned = "https://" + cleaned
    return cleaned


def is_linkedin_url(url: str) -> bool:
    """Checks if a URL points to LinkedIn."""
    lowered = url.lower().strip()
    return "linkedin.com" in lowered or "lnkd.in" in lowered


def is_portfolio_url(url: str) -> bool:
    """Checks if a URL represents a personal website or portfolio (excluding LinkedIn, GitHub, Twitter/X)."""
    lowered = url.lower().strip()
    if is_linkedin_url(lowered):
        return False
    if "github.com" in lowered or "twitter.com" in lowered or "x.com" in lowered:
        return False
    try:
        parsed = urlparse(normalize_url(lowered))
        domain = parsed.netloc.lower()
        if "." in domain and not domain.startswith("."):
            return True
    except Exception:
        pass
    return False


def analyze_profile_links(profile: UserProfile) -> Tuple[Optional[str], Optional[str]]:
    """
    Inspects user profile data (social_accounts, blog, bio) to discover:
    (linkedin_url, portfolio_url).
    Returns (None, None) if neither is present.
    """
    linkedin_url = None
    portfolio_url = None

    candidate_urls: List[str] = []

    # 1. Check social accounts
    for acc in getattr(profile, "social_accounts", []) or []:
        if isinstance(acc, dict):
            provider = (acc.get("provider") or "").lower()
            acc_url = acc.get("url") or ""
            if provider == "linkedin" or is_linkedin_url(acc_url):
                if not linkedin_url and acc_url:
                    linkedin_url = acc_url
            elif is_portfolio_url(acc_url):
                if not portfolio_url and acc_url:
                    portfolio_url = acc_url
            if acc_url:
                candidate_urls.append(acc_url)
        elif isinstance(acc, str):
            candidate_urls.append(acc)

    # 2. Check profile.blog (website field)
    if profile.blog and profile.blog.strip():
        extracted = extract_urls(profile.blog)
        if extracted:
            candidate_urls.extend(extracted)
        elif "." in profile.blog:
            candidate_urls.append(profile.blog.strip())

    # 3. Check profile.bio
    if profile.bio and profile.bio.strip():
        extracted = extract_urls(profile.bio)
        if extracted:
            candidate_urls.extend(extracted)

    # Classify candidate URLs
    for raw_u in candidate_urls:
        if not raw_u:
            continue
        if is_linkedin_url(raw_u):
            if not linkedin_url:
                linkedin_url = raw_u
        elif is_portfolio_url(raw_u):
            if not portfolio_url:
                portfolio_url = raw_u

    return linkedin_url, portfolio_url


def generate_recommendations(
    profile: UserProfile,
    repos: List[RepositoryItem],
    languages: List[LanguageStat],
    checklist: RepoQualityChecklist,
) -> List[RecommendationItem]:
    """
    Generates actionable, prioritized recommendations based strictly on collected data.
    Accurately inspects LinkedIn, portfolio, repositories, and profile fields.
    """
    recs: List[RecommendationItem] = []
    original_repos = [r for r in repos if not r.is_fork]
    eval_repos = original_repos if original_repos else repos

    # 1. Profile Bio & Name
    if not profile.bio or len(profile.bio.strip()) < 10:
        recs.append(
            RecommendationItem(
                id="rec-profile-bio",
                priority="high",
                category="Branding",
                title="Craft a targeted 1-line professional bio",
                description="Your profile currently lacks a descriptive bio. Recruiters scanning GitHub spend less than 15 seconds on a profile.",
                impact="Immediately communicates your focus (e.g., 'Full-Stack Developer | React & Python FastAPI | Open-Source Enthusiast').",
                action="Navigate to GitHub Settings -> Profile -> Bio and add a concise summary with your top 2-3 technologies and current learning goals.",
            )
        )

    if not profile.name or not profile.name.strip():
        recs.append(
            RecommendationItem(
                id="rec-profile-name",
                priority="high",
                category="Branding",
                title="Add your full name to your profile",
                description="Your profile only displays your handle. Having your real name helps campus interviewers and hiring managers match your resume to your profile.",
                impact="Builds professional credibility and search discoverability.",
                action="Set your full display name in GitHub profile settings.",
            )
        )

    # 2. Repository Descriptions
    missing_desc = [r.name for r in eval_repos if not r.has_description]
    if missing_desc:
        target_names = ", ".join(f"`{name}`" for name in missing_desc[:3])
        if len(missing_desc) > 3:
            target_names += f" and {len(missing_desc) - 3} others"
        recs.append(
            RecommendationItem(
                id="rec-repo-descriptions",
                priority="high" if len(missing_desc) >= 3 else "medium",
                category="Documentation",
                title=f"Add repository descriptions to {len(missing_desc)} project(s)",
                description=f"Repositories such as {target_names} do not have an 'About' description.",
                impact="A project without a description looks abandoned or incomplete to external visitors.",
                action="Click the gear icon on each repository's main page and provide a 1-sentence synopsis and a live deployment URL if available.",
            )
        )

    # 3. GitHub Topics / Tags
    missing_topics = [r.name for r in eval_repos if not r.has_topics]
    if len(missing_topics) >= 2 or checklist.repos_with_topics_pct < 50:
        recs.append(
            RecommendationItem(
                id="rec-repo-topics",
                priority="medium",
                category="Discoverability",
                title="Tag key repositories with discoverable topics",
                description=f"{len(missing_topics)} of your analyzed repositories have no topic tags.",
                impact="GitHub topics categorize your work in search results and showcase tech keywords to recruiters immediately.",
                action="Add 4-6 topics to each key repository (e.g., `fastapi`, `typescript`, `tailwindcss`, `docker`).",
            )
        )

    # 4. Open Source Licensing
    missing_licenses = [r.name for r in eval_repos if not r.has_license]
    if len(missing_licenses) >= 2 or checklist.repos_with_license_pct < 40:
        recs.append(
            RecommendationItem(
                id="rec-repo-licenses",
                priority="medium",
                category="Open Source Hygiene",
                title="Add standard open-source licenses",
                description=f"{len(missing_licenses)} public project(s) lack an explicit open-source license.",
                impact="Without a license, public repositories default to all-rights-reserved, discouraging adoption and external collaboration.",
                action="Add an MIT or Apache 2.0 LICENSE file using GitHub's built-in file template selector.",
            )
        )

    # 5. Activity Freshness
    if checklist.repos_active_within_6_months == 0 and len(repos) > 0:
        recs.append(
            RecommendationItem(
                id="rec-activity-freshness",
                priority="high",
                category="Activity",
                title="Refresh project activity or push recent commits",
                description="None of your public repositories show push activity within the last 6 months.",
                impact="Recruiters value recent active code commits as evidence of ongoing engagement and continuous learning.",
                action="Refactor an existing project, update dependencies, or publish your latest hackathon / coursework code.",
            )
        )

    # 6. Tech Stack Diversity
    if len(languages) <= 1 and len(repos) > 0:
        single_lang = languages[0].language if languages else "a single language"
        recs.append(
            RecommendationItem(
                id="rec-tech-stack-expansion",
                priority="low",
                category="Skill Breadth",
                title="Expand tech stack breadth beyond one language",
                description=f"Your repositories currently only demonstrate {single_lang}.",
                impact="Campus placement drives often look for full-stack versatility (e.g. backend API + modern frontend UI).",
                action="Pair your core language with complementary tools (e.g., connect a Python API to a React frontend or containerize with Docker).",
            )
        )

    # 7. Context-Aware Links & Social Presence
    linkedin_url, portfolio_url = analyze_profile_links(profile)
    has_linkedin = bool(linkedin_url)
    has_portfolio = bool(portfolio_url)

    if not has_linkedin and not has_portfolio:
        # Case 1: Neither LinkedIn nor portfolio present
        recs.append(
            RecommendationItem(
                id="rec-profile-website",
                priority="low",
                category="Branding",
                title="Add links to your portfolio and LinkedIn profile",
                description="Your profile currently lacks links to an external portfolio website and your LinkedIn profile.",
                impact="Provides recruiters a direct, frictionless path to review your live work and connect with you on professional platforms.",
                action="Navigate to GitHub Settings -> Public profile and add your LinkedIn URL and personal website to your profile card or social accounts.",
            )
        )
    elif has_linkedin and not has_portfolio:
        # Case 2: LinkedIn is present, but portfolio website is missing (do NOT recommend LinkedIn!)
        recs.append(
            RecommendationItem(
                id="rec-profile-portfolio-missing",
                priority="low",
                category="Branding",
                title="Showcase your work with a live portfolio website link",
                description=f"Your GitHub profile features your LinkedIn profile ({linkedin_url}), but does not link to a personal website or live project portfolio.",
                impact="A personal portfolio website provides an interactive showcase for your deployed projects, architecture deep-dives, and resume.",
                action="Deploy a personal portfolio site (e.g. using GitHub Pages, Vercel, or Netlify) and add the URL to your GitHub profile website field.",
            )
        )
    elif has_portfolio and not has_linkedin:
        # Case 3: Portfolio is present, but LinkedIn is missing (do NOT recommend portfolio!)
        recs.append(
            RecommendationItem(
                id="rec-profile-linkedin-missing",
                priority="low",
                category="Branding",
                title="Connect your LinkedIn profile for recruiter discoverability",
                description=f"Your profile features a personal website ({portfolio_url}), but lacks a direct link to your LinkedIn profile.",
                impact="Technical recruiters on GitHub frequently check LinkedIn for professional experience, recommendations, and direct outreach.",
                action="Add your LinkedIn profile URL to your GitHub social accounts or profile bio so recruiters can easily connect with you.",
            )
        )
    else:
        # Case 4: Both LinkedIn and Portfolio are already present!
        # Do NOT recommend either link. Identify other meaningful opportunities instead.
        login_lower = profile.login.lower().strip()
        has_profile_readme_repo = any(
            r.name.lower().strip() == login_lower and r.has_readme
            for r in repos
        )
        if not has_profile_readme_repo:
            recs.append(
                RecommendationItem(
                    id="rec-profile-readme",
                    priority="medium",
                    category="Branding",
                    title="Create a dynamic GitHub Profile README spotlight",
                    description=f"Your profile does not yet have a special `@{profile.login}/{profile.login}` repository to spotlight your work.",
                    impact="A Profile README appears prominently at the top of your GitHub profile page, giving technical recruiters an immediate visual overview of your skills, pinned projects, and career highlights.",
                    action=f"Create a public repository named exactly `{profile.login}` and add a `README.md` with project spotlights, tech stack badges, and interactive stats.",
                )
            )

        # Check for live deployment / demo links across repositories
        repos_with_homepage = [r for r in eval_repos if getattr(r, "homepage", None) and str(r.homepage).strip()]
        if len(eval_repos) > 0 and len(repos_with_homepage) == 0:
            recs.append(
                RecommendationItem(
                    id="rec-repo-live-demos",
                    priority="medium",
                    category="Project Presentation",
                    title="Add live deployment links to your flagship projects",
                    description="None of your evaluated repositories list a live deployment or preview URL in their repository details.",
                    impact="Technical recruiters spend under 2 minutes reviewing GitHub. Clickable live demos (Vercel, Netlify, Render, GitHub Pages) allow them to test your applications immediately.",
                    action="Deploy your top frontend or API projects to free modern hosting platforms and set the 'Website' field on each repository.",
                )
            )

    # Sort recommendations by priority (high -> medium -> low)
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recs.sort(key=lambda r: priority_order.get(r.priority, 3))
    return recs


def generate_roadmap(
    profile: UserProfile,
    repos: List[RepositoryItem],
    languages: List[LanguageStat],
) -> tuple[RoadmapPhase, RoadmapPhase]:
    """
    Generates structured 7-day and 30-day action roadmaps.
    Explicitly marked as Phase 1 deterministic rule-based output (mock AI engine).
    """
    primary_lang = languages[0].language if languages else "Modern Web Tech"
    top_repo_name = repos[0].name if repos else "flagship project"

    # 7-Day Quick Wins
    roadmap_7 = RoadmapPhase(
        title="7-Day Sprint: Portfolio Quick Wins",
        timeline="Week 1 (Days 1 - 7)",
        objective="Polishing public profile metadata, critical repository descriptions, and adding missing licenses.",
        is_mock_ai=True,
        ai_engine_badge="Phase 1: Deterministic Engine (Groq AI Integration scheduled for Phase 2)",
        steps=[
            RoadmapStep(
                day_or_week="Days 1 - 2",
                task="Profile & Bio Overhaul",
                details=f"Update profile display name, craft a targeted bio with keywords ({primary_lang}, full-stack), and link your LinkedIn or resume site.",
                expected_outcome="Profile completeness score increases; instant clarity for visiting recruiters.",
            ),
            RoadmapStep(
                day_or_week="Days 3 - 4",
                task="Repository Metadata & Topic Tagging",
                details="Review all public repositories: add 1-sentence summaries, set live deployment links where applicable, and tag 4-6 topics per repo.",
                expected_outcome="Repositories become searchable by tech stack; eliminates blank 'About' sections.",
            ),
            RoadmapStep(
                day_or_week="Days 5 - 7",
                task="Flagship README Makeover",
                details=f"Take your top project (`{top_repo_name}`) and add a comprehensive README with project demo GIFs/screenshots, architecture diagram, setup commands, and MIT license.",
                expected_outcome="A showcase project that immediately stands out during technical interviews.",
            ),
        ],
    )

    # 30-Day Strategic Growth
    roadmap_30 = RoadmapPhase(
        title="30-Day Roadmap: Placement-Ready Engineering Presence",
        timeline="Month 1 (Weeks 1 - 4)",
        objective="Transforming repositories into production-grade demonstrations with automated testing, CI/CD, and consistent commit momentum.",
        is_mock_ai=True,
        ai_engine_badge="Phase 1: Deterministic Engine (Groq AI Integration scheduled for Phase 2)",
        steps=[
            RoadmapStep(
                day_or_week="Week 1",
                task="Presentation & Hygiene Lockdown",
                details="Execute the 7-day sprint: clean up unneeded forks, archive abandoned scratch repos, and ensure 100% license and description coverage.",
                expected_outcome="Clean, focused catalog of high-signal repositories.",
            ),
            RoadmapStep(
                day_or_week="Week 2",
                task="Testing & CI/CD Automation",
                details=f"Add unit test coverage and a GitHub Actions workflow (`.github/workflows/ci.yml`) to `{top_repo_name}` for automated linting and test runs.",
                expected_outcome="Green build status badges proving engineering discipline and automated testing skills.",
            ),
            RoadmapStep(
                day_or_week="Week 3",
                task="Production Deployment & Live Demo",
                details="Deploy your flagship project using free modern hosting (Vercel, Render, Railway) and pin the live URL prominently in the repository header and README.",
                expected_outcome="Recruiters can test and interact with your project in 1 click without cloning code.",
            ),
            RoadmapStep(
                day_or_week="Week 4",
                task="Open Source Contribution or Case Study Article",
                details="Submit a bugfix/PR to an active open-source project or publish a technical walkthrough article (on Dev.to/Medium) detailing your architecture decisions.",
                expected_outcome="Public proof of communication skills and collaborative software development.",
            ),
        ],
    )

    return roadmap_7, roadmap_30
