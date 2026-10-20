import pytest
from app.models import UserProfile, RepositoryItem, LanguageStat, RepoQualityChecklist
from app.analyzer.recommendations import generate_recommendations, analyze_profile_links


def make_profile(
    login="testuser",
    blog=None,
    bio="Full-Stack Developer building web services.",
    social_accounts=None,
) -> UserProfile:
    return UserProfile(
        login=login,
        name="Test User",
        avatar_url="https://github.com/testuser.png",
        html_url=f"https://github.com/{login}",
        bio=bio,
        company=None,
        location="San Francisco, CA",
        blog=blog,
        twitter_username=None,
        social_accounts=social_accounts or [],
        public_repos=5,
        public_gists=0,
        followers=10,
        following=5,
        created_at="2022-01-01T00:00:00Z",
        updated_at="2026-01-01T00:00:00Z",
        account_age_years=4.0,
    )


def make_repos(login="testuser") -> list[RepositoryItem]:
    return [
        RepositoryItem(
            id=1,
            name="cool-app",
            full_name=f"{login}/cool-app",
            description="A modern web service.",
            html_url=f"https://github.com/{login}/cool-app",
            homepage=None,
            language="Python",
            stargazers_count=10,
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
    ]


def make_checklist() -> RepoQualityChecklist:
    return RepoQualityChecklist(
        total_repos_analyzed=1,
        repos_with_description=1,
        repos_with_description_pct=100.0,
        repos_with_topics=1,
        repos_with_topics_pct=100.0,
        repos_with_license=1,
        repos_with_license_pct=100.0,
        repos_active_within_6_months=1,
        repos_active_within_6_months_pct=100.0,
        original_repos_count=1,
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


def test_recommendations_case_1_neither_present():
    """Case 1: Profile has neither LinkedIn nor portfolio links."""
    p = make_profile(blog=None, bio="Software engineer", social_accounts=[])
    recs = generate_recommendations(p, make_repos(), [LanguageStat(language="Python", repo_count=1, percentage=100.0)], make_checklist())

    rec_ids = [r.id for r in recs]
    assert "rec-profile-website" in rec_ids
    assert "rec-profile-portfolio-missing" not in rec_ids
    assert "rec-profile-linkedin-missing" not in rec_ids

    matching = next(r for r in recs if r.id == "rec-profile-website")
    assert "portfolio and LinkedIn" in matching.title


def test_recommendations_case_2_linkedin_only():
    """Case 2: Profile has LinkedIn only. Must NOT recommend adding LinkedIn again."""
    p = make_profile(blog="https://www.linkedin.com/in/johndoe", social_accounts=[])
    recs = generate_recommendations(p, make_repos(), [LanguageStat(language="Python", repo_count=1, percentage=100.0)], make_checklist())

    rec_ids = [r.id for r in recs]
    assert "rec-profile-portfolio-missing" in rec_ids
    assert "rec-profile-linkedin-missing" not in rec_ids
    assert "rec-profile-website" not in rec_ids

    matching = next(r for r in recs if r.id == "rec-profile-portfolio-missing")
    assert "portfolio website" in matching.title.lower()
    # Must NOT advise adding LinkedIn
    assert "add your linkedin" not in matching.action.lower()


def test_recommendations_case_3_portfolio_only():
    """Case 3: Profile has portfolio website only. Must NOT recommend adding portfolio again."""
    p = make_profile(blog="https://johndoe.dev", social_accounts=[])
    recs = generate_recommendations(p, make_repos(), [LanguageStat(language="Python", repo_count=1, percentage=100.0)], make_checklist())

    rec_ids = [r.id for r in recs]
    assert "rec-profile-linkedin-missing" in rec_ids
    assert "rec-profile-portfolio-missing" not in rec_ids
    assert "rec-profile-website" not in rec_ids

    matching = next(r for r in recs if r.id == "rec-profile-linkedin-missing")
    assert "linkedin" in matching.title.lower()
    # Must NOT advise adding personal website
    assert "personal website" not in matching.title.lower()


def test_recommendations_case_4_both_present():
    """Case 4: Both LinkedIn and portfolio links exist. Must omit link recommendations and suggest other opportunities."""
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
