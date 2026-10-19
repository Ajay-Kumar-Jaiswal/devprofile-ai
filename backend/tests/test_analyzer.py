import pytest
from app.models import (
    UserProfile,
    RepositoryItem,
    LanguageStat,
    RepoQualityChecklist,
)
from app.analyzer.scoring import calculate_portfolio_score
from app.analyzer.recommendations import generate_recommendations, generate_roadmap


def test_scoring_boundaries_empty_profile():
    """Test scoring when profile has minimum/empty data: must remain within [0, 100]."""
    empty_profile = UserProfile(
        login="ghost",
        avatar_url="",
        html_url="https://github.com/ghost",
        public_repos=0,
    )
    score = calculate_portfolio_score(empty_profile, [], [])
    assert 0 <= score.overall_score <= 100
    assert score.tier == "Needs Work"
    assert len(score.breakdown) == 5
    for cat in score.breakdown:
        assert 0 <= cat.score <= cat.max_score


def test_scoring_boundaries_ideal_profile():
    """Test scoring with top-tier indicators: must cap at 100 and achieve Exceptional."""
    top_profile = UserProfile(
        login="star-developer",
        name="Alex Smith",
        avatar_url="https://avatars.githubusercontent.com/u/12345",
        html_url="https://github.com/star-developer",
        bio="Senior Engineer building high-performance distributed systems in Rust and Go.",
        company="Tech Giants Corp",
        location="San Francisco, CA",
        blog="https://alexsmith.tech",
        public_repos=25,
        followers=150,
        following=40,
        created_at="2020-01-01T00:00:00Z",
        account_age_years=6.0,
    )
    repos = [
        RepositoryItem(
            id=i,
            name=f"flagship-engine-{i}",
            full_name=f"star-developer/flagship-engine-{i}",
            description="Production-grade asynchronous distributed engine with benchmarks and full docs.",
            html_url=f"https://github.com/star-developer/flagship-engine-{i}",
            language="Rust" if i % 2 == 0 else "Go",
            stargazers_count=120,
            forks_count=35,
            open_issues_count=2,
            has_readme=True,
            has_description=True,
            has_topics=True,
            has_license=True,
            license_name="MIT License",
            topics=["rust", "async", "distributed", "performance"],
            is_fork=False,
            created_at="2022-01-01T00:00:00Z",
            updated_at="2026-10-15T00:00:00Z",
            pushed_at="2026-10-15T00:00:00Z",
            days_since_last_push=4,
            quality_score=100,
        )
        for i in range(1, 6)
    ]
    languages = [
        LanguageStat(language="Rust", repo_count=3, percentage=60.0),
        LanguageStat(language="Go", repo_count=2, percentage=40.0),
    ]

    score = calculate_portfolio_score(top_profile, repos, languages)
    assert 0 <= score.overall_score <= 100
    assert score.overall_score >= 85
    assert score.tier == "Exceptional"


def test_recommendation_generation_flags_missing_elements():
    """Verify that recommendations properly identify missing bio, license, and descriptions."""
    bare_profile = UserProfile(
        login="junior-dev",
        name="",  # Missing name
        avatar_url="https://avatars.githubusercontent.com/u/999",
        html_url="https://github.com/junior-dev",
        bio="",  # Missing bio
        public_repos=2,
    )
    repos = [
        RepositoryItem(
            id=1,
            name="demo-repo-1",
            full_name="junior-dev/demo-repo-1",
            description="",  # Missing description
            html_url="https://github.com/junior-dev/demo-repo-1",
            language="Python",
            stargazers_count=0,
            forks_count=0,
            open_issues_count=0,
            has_readme=True,
            has_description=False,
            has_topics=False,
            has_license=False,
            is_fork=False,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-02-01T00:00:00Z",
            days_since_last_push=500,
        )
    ]
    languages = [LanguageStat(language="Python", repo_count=1, percentage=100.0)]
    checklist = RepoQualityChecklist(
        total_repos_analyzed=1,
        repos_with_description=0,
        repos_with_description_pct=0.0,
        repos_with_topics=0,
        repos_with_topics_pct=0.0,
        repos_with_license=0,
        repos_with_license_pct=0.0,
        repos_active_within_6_months=0,
        repos_active_within_6_months_pct=0.0,
        original_repos_count=1,
        forked_repos_count=0,
    )

    recs = generate_recommendations(bare_profile, repos, languages, checklist)
    rec_ids = [r.id for r in recs]

    assert "rec-profile-bio" in rec_ids
    assert "rec-profile-name" in rec_ids
    assert "rec-repo-descriptions" in rec_ids
    assert "rec-repo-licenses" in rec_ids
    assert "rec-activity-freshness" in rec_ids

    # Priority sorting
    priorities = [r.priority for r in recs]
    order_map = {"high": 0, "medium": 1, "low": 2}
    for i in range(len(priorities) - 1):
        assert order_map[priorities[i]] <= order_map[priorities[i + 1]]


def test_roadmap_structure():
    """Verify 7-day and 30-day roadmaps return required structured steps and mock AI markers."""
    profile = UserProfile(
        login="student-coder",
        avatar_url="https://avatars.githubusercontent.com/u/123",
        html_url="https://github.com/student-coder",
    )
    repos = [
        RepositoryItem(
            id=1,
            name="portfolio-web",
            full_name="student-coder/portfolio-web",
            html_url="https://github.com/student-coder/portfolio-web",
            language="TypeScript",
            created_at="2025-01-01T00:00:00Z",
            updated_at="2025-01-01T00:00:00Z",
        )
    ]
    languages = [LanguageStat(language="TypeScript", repo_count=1, percentage=100.0)]

    r7, r30 = generate_roadmap(profile, repos, languages)
    assert r7.is_mock_ai is True
    assert "Phase 1" in r7.ai_engine_badge
    assert len(r7.steps) >= 3

    assert r30.is_mock_ai is True
    assert "Phase 1" in r30.ai_engine_badge
    assert len(r30.steps) >= 4
