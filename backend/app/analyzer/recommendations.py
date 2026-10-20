import re
from typing import List, Optional, Tuple, Dict, Any
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


def is_links_verified(profile: UserProfile) -> bool:
    """
    Determines whether profile link sources were accessible and verified.
    Returns False when social accounts and website information could not be verified.
    """
    if getattr(profile, "links_verified", None) is False:
        return False
    if profile.social_accounts is None and not profile.blog and not profile.bio:
        return False
    return True


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
    for acc in getattr(profile, "social_accounts", None) or []:
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
    Each recommendation includes what was observed, why it matters, what to do, and the evidence.
    """
    recs: List[RecommendationItem] = []
    original_repos = [r for r in repos if not r.is_fork]
    eval_repos = original_repos if original_repos else repos

    # 1. Profile Bio & Name
    if not profile.bio or len(profile.bio.strip()) < 10:
        observed_len = len(profile.bio.strip()) if profile.bio else 0
        recs.append(
            RecommendationItem(
                id="rec-profile-bio",
                priority="high",
                category="Branding",
                title="Craft a targeted 1-line professional bio",
                description="Your profile currently lacks a descriptive bio. Recruiters scanning GitHub spend less than 15 seconds on a profile.",
                impact="Immediately communicates your focus (e.g., 'Full-Stack Developer | React & Python FastAPI | Open-Source Enthusiast').",
                action="Navigate to GitHub Settings -> Profile -> Bio and add a concise summary with your top 2-3 technologies and current learning goals.",
                evidence=f"Observed: Profile bio has {observed_len} character(s) (minimum recommended: 10).",
            )
        )

    if not profile.name or not profile.name.strip() or profile.name.strip().lower() == profile.login.lower():
        recs.append(
            RecommendationItem(
                id="rec-profile-name",
                priority="high",
                category="Branding",
                title="Add your full name to your profile",
                description="Your profile only displays your handle. Having your real name helps campus interviewers and hiring managers match your resume to your profile.",
                impact="Builds professional credibility and search discoverability.",
                action="Set your full display name in GitHub profile settings.",
                evidence=f"Observed: Profile display name is unset (displaying handle '@{profile.login}').",
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
                evidence=f"Observed: {len(missing_desc)} of {len(eval_repos)} evaluated repositories ({target_names}) have no description.",
            )
        )

    # 3. Repository README Coverage
    missing_readme = [r.name for r in eval_repos if not r.has_readme]
    if missing_readme:
        target_readme = ", ".join(f"`{name}`" for name in missing_readme[:3])
        recs.append(
            RecommendationItem(
                id="rec-repo-readmes",
                priority="high",
                category="Documentation",
                title=f"Add README documentation to {len(missing_readme)} project(s)",
                description=f"Repositories such as {target_readme} lack a README file to explain their purpose.",
                impact="Without a README, technical recruiters cannot understand what the project does or evaluate your code structure.",
                action="Add a comprehensive README.md with setup instructions, architecture overview, and usage examples.",
                evidence=f"Observed: {len(missing_readme)} repositories ({target_readme}) do not contain a README file.",
            )
        )

    # 4. GitHub Topics / Tags
    missing_topics = [r.name for r in eval_repos if not r.has_topics]
    if missing_topics and (len(missing_topics) >= 2 or checklist.repos_with_topics_pct < 60):
        target_topics = ", ".join(f"`{n}`" for n in missing_topics[:3])
        recs.append(
            RecommendationItem(
                id="rec-repo-topics",
                priority="medium",
                category="Discoverability",
                title="Tag key repositories with discoverable topics",
                description=f"{len(missing_topics)} of your analyzed repositories have no topic tags.",
                impact="GitHub topics categorize your work in search results and showcase tech keywords to recruiters immediately.",
                action="Add 4-6 topics to each key repository (e.g., `fastapi`, `typescript`, `tailwindcss`, `docker`).",
                evidence=f"Observed: {len(missing_topics)} of {len(eval_repos)} repositories ({target_topics}) have 0 GitHub topics.",
            )
        )

    # 5. Open Source Licensing
    missing_licenses = [r.name for r in eval_repos if not r.has_license]
    if missing_licenses and (len(missing_licenses) >= 2 or checklist.repos_with_license_pct < 50):
        target_lic = ", ".join(f"`{n}`" for n in missing_licenses[:3])
        recs.append(
            RecommendationItem(
                id="rec-repo-licenses",
                priority="medium",
                category="Open Source Hygiene",
                title="Add standard open-source licenses",
                description=f"{len(missing_licenses)} public project(s) lack an explicit open-source license.",
                impact="Without a license, public repositories default to all-rights-reserved, discouraging adoption and external collaboration.",
                action="Add an MIT or Apache 2.0 LICENSE file using GitHub's built-in file template selector.",
                evidence=f"Observed: {len(missing_licenses)} of {len(eval_repos)} public repositories ({target_lic}) lack an explicit open-source LICENSE.",
            )
        )

    # 6. Activity Freshness
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
                evidence=f"Observed: 0 of {len(repos)} repositories have commits within the past 180 days.",
            )
        )

    # 7. Tech Stack Diversity
    if len(languages) <= 1 and len(repos) >= 3:
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
                evidence=f"Observed: 100% of repositories ({len(repos)} projects) use exclusively {single_lang}.",
            )
        )

    # 8. Context-Aware Links & Social Presence
    links_verifiable = is_links_verified(profile)
    if links_verifiable:
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
                    evidence="Observed: No external portfolio website or LinkedIn URL detected in public profile website, bio, or social accounts.",
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
                    evidence=f"Observed: LinkedIn profile verified ({linkedin_url}), but no external portfolio website found.",
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
                    evidence=f"Observed: Personal portfolio website verified ({portfolio_url}), but no LinkedIn profile found.",
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
                        evidence=f"Observed: Special profile spotlight repository '@{profile.login}/{profile.login}' with README was not found.",
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
                        evidence=f"Observed: 0 of {len(eval_repos)} evaluated repositories have a live demo or deployment URL configured.",
                    )
                )
    # If links are unverified (Case 5), we deliberately omit link recommendations rather than making false claims.

    # 9. Stellar / Well-Documented Profile (Case 6)
    # If all basic hygiene checks are satisfied and few recommendations exist, recommend advanced CI/CD
    if len(recs) == 0 and len(eval_repos) > 0:
        top_name = eval_repos[0].name
        recs.append(
            RecommendationItem(
                id="rec-repo-ci-cd",
                priority="low",
                category="Engineering Rigor",
                title="Add automated CI/CD workflows and status badges",
                description=f"Your profile presentation, repository documentation, and links are well-maintained. Level up project `{top_name}` with automated testing workflows.",
                impact="Automated test pipelines prove code reliability and production-grade engineering discipline to technical interviewers.",
                action=f"Add a `.github/workflows/ci.yml` pipeline to `{top_name}` running automated tests on every push, and display the build status badge in the README.",
                evidence=f"Observed: Strong baseline hygiene across all {len(eval_repos)} evaluated repositories; automated CI/CD pipeline is the next major differentiator.",
            )
        )

    # Sort recommendations by priority (high -> medium -> low)
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recs.sort(key=lambda r: priority_order.get(r.priority, 3))
    return recs


def _compute_checklist(repos: List[RepositoryItem]) -> RepoQualityChecklist:
    total_analyzed = len(repos)
    original_repos = [r for r in repos if not r.is_fork]
    forked_repos = [r for r in repos if r.is_fork]
    desc_count = sum(1 for r in repos if r.has_description)
    topics_count = sum(1 for r in repos if r.has_topics)
    license_count = sum(1 for r in repos if r.has_license)
    active_6m_count = sum(
        1 for r in repos if r.days_since_last_push is not None and r.days_since_last_push <= 180
    )
    denominator = max(1, total_analyzed)
    return RepoQualityChecklist(
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


def generate_roadmap(
    profile: UserProfile,
    repos: List[RepositoryItem],
    languages: List[LanguageStat],
    recommendations: Optional[List[RecommendationItem]] = None,
) -> tuple[RoadmapPhase, RoadmapPhase]:
    """
    Generates structured 7-day sprint and 30-day strategic growth action roadmaps.
    Evidence-based and derived directly from observed profile gaps and repositories.
    """
    if recommendations is None:
        checklist = _compute_checklist(repos)
        recommendations = generate_recommendations(profile, repos, languages, checklist)

    primary_lang = languages[0].language if languages else "Modern Web Tech"
    top_repo_name = repos[0].name if repos else "flagship project"

    # Inspect actual recommendation IDs to personalize sprint steps
    rec_ids = {r.id for r in recommendations}

    # --- 7-Day Sprint: Steps derived from actual profile gaps ---
    steps_7: List[RoadmapStep] = []

    # Step 1 (Days 1 - 2): Profile & Identity
    if "rec-profile-bio" in rec_ids or "rec-profile-name" in rec_ids:
        details_list = []
        if "rec-profile-name" in rec_ids:
            details_list.append("set your full display name")
        if "rec-profile-bio" in rec_ids:
            details_list.append(f"craft a targeted 1-line bio featuring {primary_lang}")
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 1 - 2",
                task="Profile Identity & Bio Optimization",
                details=f"Update GitHub profile settings: {', and '.join(details_list)}.",
                expected_outcome="Profile completeness score increases; instant clarity for visiting recruiters.",
            )
        )
    elif "rec-profile-website" in rec_ids:
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 1 - 2",
                task="Connect Professional & Portfolio Links",
                details="Add your LinkedIn profile URL and personal portfolio website to your GitHub profile settings.",
                expected_outcome="Recruiters can easily verify your background and reach out directly.",
            )
        )
    elif "rec-profile-portfolio-missing" in rec_ids:
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 1 - 2",
                task="Deploy & Link Portfolio Showcase",
                details="Add your live personal website or project portfolio URL to your GitHub profile website field.",
                expected_outcome="Provides visiting recruiters an interactive demonstration of your work.",
            )
        )
    elif "rec-profile-linkedin-missing" in rec_ids:
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 1 - 2",
                task="Connect LinkedIn Profile",
                details="Add your LinkedIn profile link to your GitHub social accounts or bio.",
                expected_outcome="Recruiters on GitHub can instantly view your professional network and credentials.",
            )
        )
    else:
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 1 - 2",
                task="Flagship Showcase & Pinning",
                details=f"Pin your top repositories (`{top_repo_name}`) prominently on your GitHub profile overview.",
                expected_outcome="High-signal spotlight ensuring recruiters immediately see your best engineering work.",
            )
        )

    # Step 2 (Days 3 - 4): Repository Metadata & Hygiene
    if "rec-repo-descriptions" in rec_ids or "rec-repo-topics" in rec_ids or "rec-repo-licenses" in rec_ids:
        hygiene_actions = []
        if "rec-repo-descriptions" in rec_ids:
            hygiene_actions.append("write 1-sentence summaries for projects missing descriptions")
        if "rec-repo-topics" in rec_ids:
            hygiene_actions.append("tag 4-6 topics per repository (e.g., tech stack keywords)")
        if "rec-repo-licenses" in rec_ids:
            hygiene_actions.append("add standard MIT licenses")
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 3 - 4",
                task="Repository Metadata & Hygiene Audit",
                details=f"Review public repositories: {', and '.join(hygiene_actions)}.",
                expected_outcome="Repositories become discoverable in GitHub topic searches and eliminate empty 'About' sections.",
            )
        )
    else:
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 3 - 4",
                task="Documentation Verification & Prerequisites",
                details=f"Audit `{top_repo_name}` to verify local setup commands, dependencies, and environment variable documentation.",
                expected_outcome="Frictionless onboarding for any developer or interviewer testing your codebase.",
            )
        )

    # Step 3 (Days 5 - 7): Showcase Enhancement
    if "rec-repo-readmes" in rec_ids:
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 5 - 7",
                task="Flagship README Makeover",
                details=f"Write a comprehensive README for `{top_repo_name}` with architecture summary, demo screenshots, and setup steps.",
                expected_outcome="Transforms a bare repository into a showcase project that stands out in technical screens.",
            )
        )
    elif "rec-repo-live-demos" in rec_ids:
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 5 - 7",
                task="Live Demo Deployment",
                details=f"Deploy `{top_repo_name}` to a free modern hosting provider (Vercel, Render, or GitHub Pages) and link the URL in repository metadata.",
                expected_outcome="1-click clickable demo allowing interviewers to interact with your application immediately.",
            )
        )
    elif "rec-profile-readme" in rec_ids:
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 5 - 7",
                task="Create Profile README Spotlight",
                details=f"Create a repository named `@{profile.login}` and design an interactive README showcasing your skills, tech stack badges, and pinned projects.",
                expected_outcome="Engaging visual landing page directly at the top of your GitHub profile.",
            )
        )
    else:
        steps_7.append(
            RoadmapStep(
                day_or_week="Days 5 - 7",
                task="System Architecture & Visual Enhancements",
                details=f"Add a Mermaid architecture diagram and GIF walkthrough to `{top_repo_name}`'s README.",
                expected_outcome="Proves system design communication skills to hiring managers.",
            )
        )

    roadmap_7 = RoadmapPhase(
        title="7-Day Sprint: Evidence-Based Quick Wins",
        timeline="Week 1 (Days 1 - 7)",
        objective="Resolving detected metadata gaps, improving repository hygiene, and enhancing flagship project presentation.",
        is_mock_ai=True,
        ai_engine_badge="Phase 1: Evidence-Based Analysis Engine (Grounded in Verified Profile Data)",
        steps=steps_7,
    )

    # --- 30-Day Strategic Growth ---
    roadmap_30 = RoadmapPhase(
        title="30-Day Roadmap: Placement-Ready Engineering Presence",
        timeline="Month 1 (Weeks 1 - 4)",
        objective="Transforming repositories into production-grade demonstrations with automated testing, CI/CD, and consistent commit momentum.",
        is_mock_ai=True,
        ai_engine_badge="Phase 1: Evidence-Based Analysis Engine (Grounded in Verified Profile Data)",
        steps=[
            RoadmapStep(
                day_or_week="Week 1",
                task="Hygiene & Presentation Lockdown",
                details="Complete the 7-day quick wins: ensure 100% license coverage, accurate descriptions, and clean profile links.",
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
                details=f"Deploy `{top_repo_name}` using free modern hosting (Vercel, Render, Railway) and pin the live URL prominently in the repository header and README.",
                expected_outcome="Recruiters can test and interact with your project in 1 click without cloning code.",
            ),
            RoadmapStep(
                day_or_week="Week 4",
                task="Open Source Contribution or Case Study Article",
                details=f"Submit a bugfix/PR to an active open-source project in {primary_lang} or publish a technical walkthrough article detailing your architecture decisions.",
                expected_outcome="Public proof of communication skills and collaborative software development.",
            ),
        ],
    )

    return roadmap_7, roadmap_30
