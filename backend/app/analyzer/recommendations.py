from typing import List
from app.models import (
    UserProfile,
    RepositoryItem,
    LanguageStat,
    RepoQualityChecklist,
    RecommendationItem,
    RoadmapPhase,
    RoadmapStep,
)


def generate_recommendations(
    profile: UserProfile,
    repos: List[RepositoryItem],
    languages: List[LanguageStat],
    checklist: RepoQualityChecklist,
) -> List[RecommendationItem]:
    """
    Generates actionable, prioritized recommendations based strictly on collected data.
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

    # 7. Website / Portfolio link
    if not profile.blog or not profile.blog.strip():
        recs.append(
            RecommendationItem(
                id="rec-profile-website",
                priority="low",
                category="Branding",
                title="Add a link to your live portfolio or LinkedIn",
                description="No external URL is linked on your profile card.",
                impact="Provides a frictionless path for hiring managers to view your resume or connect on professional platforms.",
                action="Add your LinkedIn profile URL or deployed personal website to your GitHub profile links.",
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
