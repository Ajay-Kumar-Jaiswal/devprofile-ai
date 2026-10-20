import pytest
from app.models import UserProfile, RepositoryItem, LanguageStat, RepoQualityChecklist
from app.analyzer.recommendations import (
    generate_recommendations,
    analyze_profile_links,
    generate_roadmap,
    is_links_verified,
)


def make_profile(
    login="testuser",
    name="Test User",
    blog=None,
    bio="Full-Stack Developer building web services.",
    social_accounts=None,
) -> UserProfile:
    return UserProfile(
        login=login,
        name=name,
        avatar_url="https://github.com/testuser.png",
        html_url=f"https://github.com/{login}",
        bio=bio,
        company=None,
        location="San Francisco, CA",
        blog=blog,
        twitter_username=None,
        social_accounts=social_accounts if social_accounts is not None else [],
        public_repos=5,
        public_gists=0,
        followers=10,
        following=5,
        created_at="2022-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
        account_age_years=4.0,
    )


def make_repos(login="testuser", count=1) -> list[RepositoryItem]:
    repos = []
    for i in range(1, count + 1):
        repos.append(
            RepositoryItem(
                id=i,
                name=f"cool-app-{i}" if count > 1 else "cool-app",
                full_name=f"{login}/cool-app-{i}" if count > 1 else f"{login}/cool-app",
                description="A modern web service.",
                html_url=f"https://github.com/{login}/cool-app-{i}",
                homepage="https://coolapp.dev" if i == 1 else None,
                language="Python",
                stargazers_count=10 * i,
                forks_count=2,
                open_issues_count=0,
                watchers_count=10,
                has_readme=True,
                has_description=True,
                has_topics=True,
                has_license=True,
                license_name="MIT",
                topics=["fastapi", "react"],
                is_fork=False,
                created_at="2023-01-01T00:00:00Z",
                updated_at="2026-09-01T00:00:00Z",
                pushed_at="2026-09-01T00:00:00Z",
                days_since_last_push=30,
                quality_score=90,
            )
        )
    return repos


def make_checklist(count=1, pct=100.0) -> RepoQualityChecklist:
    return RepoQualityChecklist(
        total_repos_analyzed=count,
        repos_with_description=count if pct == 100.0 else int(count * (pct / 100.0)),
        repos_with_description_pct=pct,
        repos_with_topics=count if pct == 100.0 else int(count * (pct / 100.0)),
        repos_with_topics_pct=pct,
        repos_with_license=count if pct == 100.0 else int(count * (pct / 100.0)),
        repos_with_license_pct=pct,
        repos_active_within_6_months=count if pct == 100.0 else 0,
        repos_active_within_6_months_pct=pct if pct == 100.0 else 0.0,
        original_repos_count=count,
        forked_repos_count=0,
    )


def test_analyze_profile_links_classification():
    """Verify accurate extraction and classification of LinkedIn and portfolio URLs."""
    # Neither
    p0 = make_profile(blog="", bio="Developer")
    li0, pf0 = analyze_profile_links(p0)
    assert li0 is None
    assert pf0 is None

    # LinkedIn in blog
    p1 = make_profile(blog="https://www.linkedin.com/in/johndoe")
    li1, pf1 = analyze_profile_links(p1)
    assert li1 == "https://www.linkedin.com/in/johndoe"
    assert pf1 is None

    # Portfolio in blog, LinkedIn in social_accounts
    p2 = make_profile(
        blog="https://johndoe.dev",
        social_accounts=[{"provider": "linkedin", "url": "https://linkedin.com/in/johndoe"}],
    )
    li2, pf2 = analyze_profile_links(p2)
    assert li2 == "https://linkedin.com/in/johndoe"
    assert pf2 == "https://johndoe.dev"

    # Portfolio in bio, LinkedIn in blog
    p3 = make_profile(
        blog="https://linkedin.com/in/johndoe",
        bio="Check out my portfolio at https://johndoe.io for case studies.",
    )
    li3, pf3 = analyze_profile_links(p3)
    assert li3 == "https://linkedin.com/in/johndoe"
    assert pf3 == "https://johndoe.io"


def test_scenario_1_neither_present():
    """Scenario 1: Profile has neither LinkedIn nor portfolio links."""
    p = make_profile(blog=None, bio="Software engineer building distributed systems", social_accounts=[])
    recs = generate_recommendations(p, make_repos(), [LanguageStat(language="Python", repo_count=1, percentage=100.0)], make_checklist())

    rec_ids = [r.id for r in recs]
    assert "rec-profile-website" in rec_ids
    assert "rec-profile-portfolio-missing" not in rec_ids
    assert "rec-profile-linkedin-missing" not in rec_ids

    matching = next(r for r in recs if r.id == "rec-profile-website")
    assert "portfolio and LinkedIn" in matching.title
    assert matching.evidence is not None


def test_scenario_2_linkedin_only():
    """Scenario 2: Profile has LinkedIn only. Must NOT recommend adding LinkedIn again."""
    p = make_profile(blog="https://www.linkedin.com/in/johndoe", social_accounts=[])
    recs = generate_recommendations(p, make_repos(), [LanguageStat(language="Python", repo_count=1, percentage=100.0)], make_checklist())

    rec_ids = [r.id for r in recs]
    assert "rec-profile-portfolio-missing" in rec_ids
    assert "rec-profile-linkedin-missing" not in rec_ids
    assert "rec-profile-website" not in rec_ids

    matching = next(r for r in recs if r.id == "rec-profile-portfolio-missing")
    assert "portfolio website" in matching.title.lower()
    assert "add your linkedin" not in matching.action.lower()
    assert "linkedin.com/in/johndoe" in matching.evidence


def test_scenario_3_portfolio_only():
    """Scenario 3: Profile has portfolio website only. Must NOT recommend adding portfolio again."""
    p = make_profile(blog="https://johndoe.dev", social_accounts=[])
    recs = generate_recommendations(p, make_repos(), [LanguageStat(language="Python", repo_count=1, percentage=100.0)], make_checklist())

    rec_ids = [r.id for r in recs]
    assert "rec-profile-linkedin-missing" in rec_ids
    assert "rec-profile-portfolio-missing" not in rec_ids
    assert "rec-profile-website" not in rec_ids

    matching = next(r for r in recs if r.id == "rec-profile-linkedin-missing")
    assert "linkedin" in matching.title.lower()
    assert "personal website" not in matching.title.lower()
    assert "johndoe.dev" in matching.evidence


def test_scenario_4_both_present():
    """Scenario 4: Both LinkedIn and portfolio links exist. Must omit link recommendations and suggest other opportunities."""
    p = make_profile(
        login="star-coder",
        blog="https://starcoder.io",
        social_accounts=[{"provider": "linkedin", "url": "https://linkedin.com/in/starcoder"}],
    )
    repos = make_repos(login="star-coder")
    recs = generate_recommendations(p, repos, [LanguageStat(language="Python", repo_count=1, percentage=100.0)], make_checklist())

    rec_ids = [r.id for r in recs]
    # Neither link recommendation should be present
    assert "rec-profile-website" not in rec_ids
    assert "rec-profile-portfolio-missing" not in rec_ids
    assert "rec-profile-linkedin-missing" not in rec_ids

    # Meaningful alternatives must be suggested based on data (e.g. Profile README or live demos)
    assert "rec-profile-readme" in rec_ids or "rec-repo-live-demos" in rec_ids


def test_scenario_5_links_unverified():
    """Scenario 5: Links are unavailable or cannot be verified. Must omit link recommendations without false claims."""
    # social_accounts is None, blog is None, bio is None
    p = UserProfile(
        login="private-user",
        name="Private User",
        avatar_url="https://github.com/private.png",
        html_url="https://github.com/private-user",
        bio=None,
        blog=None,
        social_accounts=None,
        public_repos=2,
    )
    assert is_links_verified(p) is False

    recs = generate_recommendations(p, make_repos(login="private-user"), [LanguageStat(language="Python", repo_count=1, percentage=100.0)], make_checklist())
    rec_ids = [r.id for r in recs]

    # Must NOT claim links are missing when unverified
    assert "rec-profile-website" not in rec_ids
    assert "rec-profile-portfolio-missing" not in rec_ids
    assert "rec-profile-linkedin-missing" not in rec_ids


def test_scenario_6_well_documented_profile():
    """Scenario 6: A well-documented profile with strong repositories and few obvious gaps."""
    login = "alex-senior"
    p = make_profile(
        login=login,
        name="Alex Senior",
        blog="https://alexdev.io",
        bio="Senior Full-Stack Engineer specializing in FastAPI, React, and Kubernetes.",
        social_accounts=[{"provider": "linkedin", "url": "https://linkedin.com/in/alexsenior"}],
    )
    # Profile README repository exists
    profile_readme_repo = RepositoryItem(
        id=99,
        name=login,
        full_name=f"{login}/{login}",
        description="Profile spotlight repository",
        html_url=f"https://github.com/{login}/{login}",
        homepage=None,
        language=None,
        stargazers_count=50,
        forks_count=5,
        open_issues_count=0,
        watchers_count=50,
        has_readme=True,
        has_description=True,
        has_topics=True,
        has_license=True,
        license_name="MIT",
        topics=["profile"],
        is_fork=False,
        created_at="2022-01-01T00:00:00Z",
        updated_at="2026-10-01T00:00:00Z",
        pushed_at="2026-10-01T00:00:00Z",
        days_since_last_push=5,
        quality_score=95,
    )
    repos = [profile_readme_repo] + make_repos(login=login, count=3)
    checklist = make_checklist(count=4, pct=100.0)
    langs = [
        LanguageStat(language="TypeScript", repo_count=2, percentage=50.0),
        LanguageStat(language="Python", repo_count=2, percentage=50.0),
    ]

    recs = generate_recommendations(p, repos, langs, checklist)
    rec_ids = [r.id for r in recs]

    # Must NOT invent fake issues
    assert "rec-profile-bio" not in rec_ids
    assert "rec-profile-name" not in rec_ids
    assert "rec-repo-descriptions" not in rec_ids
    assert "rec-repo-licenses" not in rec_ids
    assert "rec-repo-topics" not in rec_ids
    assert "rec-activity-freshness" not in rec_ids
    assert "rec-profile-website" not in rec_ids

    # Advanced optimization (CI/CD) is recommended instead
    assert "rec-repo-ci-cd" in rec_ids

    # Roadmap should NOT suggest adding LinkedIn or writing basic descriptions
    r7, r30 = generate_roadmap(p, repos, langs, recs)
    all_step_details = " ".join([s.details for s in r7.steps + r30.steps]).lower()
    assert "add your linkedin" not in all_step_details
    assert "link your linkedin" not in all_step_details


def test_scenario_7_incomplete_profile_data():
    """Scenario 7: Profile with incomplete data and several genuine improvement opportunities."""
    login = "beginner-dev"
    p = make_profile(
        login=login,
        name="",  # Missing name
        bio="student",  # Too short (<10 chars)
        blog=None,
        social_accounts=[],
    )
    repos = [
        RepositoryItem(
            id=1,
            name="unfinished-project",
            full_name=f"{login}/unfinished-project",
            description="",  # Missing description
            html_url=f"https://github.com/{login}/unfinished-project",
            homepage=None,
            language="Python",
            stargazers_count=0,
            forks_count=0,
            open_issues_count=0,
            watchers_count=0,
            has_readme=False,  # Missing README
            has_description=False,
            has_topics=False,  # Missing topics
            has_license=False,  # Missing license
            license_name=None,
            topics=[],
            is_fork=False,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2025-01-01T00:00:00Z",
            pushed_at="2025-01-01T00:00:00Z",
            days_since_last_push=300,  # Inactive > 6 months
            quality_score=20,
        )
    ]
    checklist = make_checklist(count=1, pct=0.0)
    langs = [LanguageStat(language="Python", repo_count=1, percentage=100.0)]

    recs = generate_recommendations(p, repos, langs, checklist)
    rec_ids = [r.id for r in recs]

    # All genuine gaps must be accurately detected
    assert "rec-profile-bio" in rec_ids
    assert "rec-profile-name" in rec_ids
    assert "rec-repo-descriptions" in rec_ids
    assert "rec-repo-readmes" in rec_ids
    assert "rec-repo-topics" in rec_ids
    assert "rec-repo-licenses" in rec_ids
    assert "rec-activity-freshness" in rec_ids
    assert "rec-profile-website" in rec_ids

    # Every recommendation must provide factual evidence
    for rec in recs:
        assert rec.evidence is not None
        assert "Observed:" in rec.evidence

    # Roadmap must address these specific gaps
    r7, r30 = generate_roadmap(p, repos, langs, recs)
    all_7_details = " ".join([s.details for s in r7.steps]).lower()
    assert "bio" in all_7_details
    assert "unfinished-project" in all_7_details or "repositories" in all_7_details
