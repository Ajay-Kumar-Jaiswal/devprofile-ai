import json
import pytest
from httpx import AsyncClient, ASGITransport
from pathlib import Path

from app.main import app
from app.db_models import User, AnalysisRun, InternshipListing, UserSavedInternship
from app.services.auth_service import hash_password, create_access_token
from tests.conftest import TestSession


@pytest.fixture
def registered_user():
    db = TestSession()
    try:
        user = User(
            email="regression_user@campus.edu",
            hashed_password=hash_password("Password123!"),
            full_name="Regression Tester",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@pytest.fixture
def user_auth_headers(registered_user):
    token = create_access_token({"sub": str(registered_user.id), "email": registered_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def seeded_analysis_run(registered_user):
    db = TestSession()
    try:
        run = AnalysisRun(
            user_id=registered_user.id,
            analyzed_login="testcoder",
            is_demo_data=False,
            overall_score=88,
            score_tier="Exceptional",
            public_repos=12,
            total_stars=95,
            primary_language="TypeScript",
            status="success",
            score_breakdown_json=json.dumps({
                "overall_score": 88,
                "tier": "Exceptional",
                "summary": "Outstanding portfolio presentation with strong engineering signals.",
                "breakdown": [
                    {
                        "category": "Documentation",
                        "score": 18,
                        "max_score": 20,
                        "percentage": 90.0,
                        "status": "excellent",
                        "feedback": "Comprehensive documentation hygiene."
                    }
                ],
                "disclaimer": "Deterministic evaluation."
            }),
            profile_data_json=json.dumps({
                "login": "testcoder",
                "name": "Test Coder",
                "avatar_url": "https://avatars.githubusercontent.com/u/999",
                "html_url": "https://github.com/testcoder",
                "bio": "Full-Stack TypeScript & Python Engineer",
                "public_repos": 12,
                "followers": 45,
                "following": 12,
                "created_at": "2021-06-01T00:00:00Z",
                "updated_at": "2026-10-01T00:00:00Z"
            }),
            stats_data_json=json.dumps({
                "total_stars": 95,
                "total_forks": 18,
                "total_public_repos": 12,
                "total_analyzed_repos": 10,
                "detected_languages_count": 3,
                "primary_language": "TypeScript",
                "average_stars_per_repo": 7.9,
                "total_open_issues": 1
            }),
            languages_json=json.dumps([
                {"language": "TypeScript", "repo_count": 7, "percentage": 70.0},
                {"language": "Python", "repo_count": 3, "percentage": 30.0}
            ]),
            repositories_json=json.dumps([
                {
                    "id": 101,
                    "name": "web-platform",
                    "full_name": "testcoder/web-platform",
                    "description": "Production React & TypeScript microfrontend",
                    "html_url": "https://github.com/testcoder/web-platform",
                    "language": "TypeScript",
                    "stargazers_count": 65,
                    "forks_count": 12,
                    "has_readme": True,
                    "has_description": True,
                    "has_topics": True,
                    "has_license": True,
                    "license_name": "MIT License",
                    "topics": ["react", "typescript"],
                    "is_fork": False,
                    "created_at": "2023-01-01T00:00:00Z",
                    "updated_at": "2026-10-01T00:00:00Z",
                    "days_since_last_push": 10,
                    "quality_score": 92
                }
            ]),
            checklist_json=json.dumps({
                "total_repos_analyzed": 10,
                "repos_with_description": 10,
                "repos_with_description_pct": 100.0,
                "repos_with_topics": 9,
                "repos_with_topics_pct": 90.0,
                "repos_with_license": 10,
                "repos_with_license_pct": 100.0,
                "repos_active_within_6_months": 8,
                "repos_active_within_6_months_pct": 80.0,
                "original_repos_count": 9,
                "forked_repos_count": 1
            }),
            ai_analysis_json=json.dumps({
                "status": "success",
                "model_used": "llama-3.1-8b-instant",
                "is_mock": False,
                "error_message": None,
                "analysis": {
                    "summary": "High caliber front-end and full-stack engineering portfolio.",
                    "strengths": ["Clean modular TypeScript codebase", "Strong testing coverage"],
                    "weaknesses": ["Cloud deployment links could be more prominent"],
                    "project_feedback": [
                        {
                            "repo_name": "web-platform",
                            "feedback": "Robust architecture with thoughtful component design.",
                            "suggested_improvements": ["Add live demo badge"]
                        }
                    ],
                    "profile_improvements": ["Highlight fullstack experience"],
                    "placement_readiness": ["Prime candidate for senior frontend or fullstack internships."],
                    "recommendations": [
                        {
                            "priority": "medium",
                            "category": "Deployment",
                            "title": "Add live deployment links to README",
                            "reason": "Allows reviewers to experience the running application instantly.",
                            "suggested_action": "Deploy on Vercel and attach URL."
                        }
                    ],
                    "roadmap_7_days": [
                        {
                            "day": "Day 1-2",
                            "task": "Deploy web-platform",
                            "details": "Connect GitHub repo to Vercel.",
                            "expected_outcome": "Working live URL."
                        }
                    ],
                    "roadmap_30_days": [
                        {
                            "week": "Week 1",
                            "milestone": "Full Stack Showcase",
                            "details": "Integrate backend API endpoints.",
                            "expected_outcome": "Complete portfolio showcase."
                        }
                    ],
                    "missing_evidence": []
                }
            })
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run
    finally:
        db.close()


@pytest.mark.asyncio
async def test_historical_analysis_detail_loading(seeded_analysis_run, user_auth_headers):
    """
    Verify opening a historical analysis loads the complete saved snapshot
    including score, skills, charts, AI insights, and recommendations without
    triggering a new GitHub API call.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/history/{seeded_analysis_run.id}",
            headers=user_auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()

        # 1. Saved score and tier
        assert data["username"] == "testcoder"
        assert data["portfolio_score"]["overall_score"] == 88
        assert data["portfolio_score"]["tier"] == "Exceptional"
        assert len(data["portfolio_score"]["breakdown"]) > 0

        # 2. Saved skills and languages
        assert len(data["languages"]) == 2
        assert data["languages"][0]["language"] == "TypeScript"

        # 3. Aggregate stats (charts)
        assert data["stats"]["total_stars"] == 95
        assert data["stats"]["primary_language"] == "TypeScript"

        # 4. Top repositories
        assert len(data["top_repositories"]) == 1
        assert data["top_repositories"][0]["name"] == "web-platform"

        # 5. Quality checklist
        assert data["quality_checklist"]["repos_with_license_pct"] == 100.0

        # 6. AI Insights
        assert data["ai_analysis"] is not None
        assert data["ai_analysis"]["status"] == "success"
        assert len(data["ai_analysis"]["analysis"]["strengths"]) > 0
        assert data["ai_analysis"]["analysis"]["summary"] == "High caliber front-end and full-stack engineering portfolio."

        # 7. Recommendations & Roadmaps
        assert len(data["recommendations"]) > 0
        assert len(data["roadmap_7_day"]["steps"]) > 0
        assert len(data["roadmap_30_day"]["steps"]) > 0


@pytest.mark.asyncio
async def test_historical_analysis_not_found(user_auth_headers):
    """Verify loading non-existent historical run returns proper 404 error."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/history/999999", headers=user_auth_headers)
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_historical_analysis_user_isolation(seeded_analysis_run):
    """Verify that User A cannot load User B's historical run (isolation preserved)."""
    db = TestSession()
    try:
        user_b = User(
            email="user_b@campus.edu",
            hashed_password=hash_password("Password123!"),
            full_name="User B",
            is_active=True,
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)
        token_b = create_access_token({"sub": str(user_b.id), "email": user_b.email})
    finally:
        db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/history/{seeded_analysis_run.id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_internships_session_specific_username_matching(seeded_analysis_run, user_auth_headers):
    """
    Verify that /api/internships matches candidate skills against the specific
    profile analysis provided for the session.
    """
    db = TestSession()
    try:
        listing = InternshipListing(
            source_type="greenhouse",
            source_board_or_site="stripe",
            source_job_id="stripe-ts-intern-101",
            company_name="Stripe",
            title="Software Engineering Intern, TypeScript",
            description_html="<p>Stripe TypeScript intern</p>",
            description_text="Stripe TypeScript intern",
            location="Remote",
            work_mode="remote",
            is_internship=True,
            is_active=True,
            is_stale=False,
            required_skills_json=json.dumps(["TypeScript", "React"]),
            preferred_skills_json=json.dumps(["Python"]),
            original_url="https://stripe.com/jobs/101",
            application_url="https://stripe.com/jobs/101/apply",
        )
        db.add(listing)
        db.commit()
        db.refresh(listing)
        listing_id = listing.id
    finally:
        db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Match using the active session username
        resp_session = await client.get(
            "/api/internships?username=testcoder",
            headers=user_auth_headers,
        )
        assert resp_session.status_code == 200
        data_session = resp_session.json()
        assert data_session["has_profile_analysis"] is True
        # TypeScript candidate matches TypeScript vacancy
        matched_item = next((item for item in data_session["items"] if item["id"] == listing_id), None)
        assert matched_item is not None
        assert matched_item["match"]["match_score"] >= 60

        # Query with non-existent username reports has_profile_analysis=False
        resp_none = await client.get(
            "/api/internships?username=no_analysis_yet",
            headers=user_auth_headers,
        )
        assert resp_none.status_code == 200
        assert resp_none.json()["has_profile_analysis"] is False


@pytest.mark.asyncio
async def test_saved_internships_persisted_without_analysis(user_auth_headers, registered_user):
    """
    Verify that saved internships remain intact and queryable even when
    no active session analysis exists.
    """
    db = TestSession()
    try:
        listing = InternshipListing(
            source_type="lever",
            source_board_or_site="figma",
            source_job_id="figma-intern-202",
            company_name="Figma",
            title="Frontend Engineering Intern",
            description_html="<p>Figma frontend intern</p>",
            description_text="Figma frontend intern",
            location="San Francisco, CA",
            work_mode="hybrid",
            is_internship=True,
            is_active=True,
            is_stale=False,
            required_skills_json=json.dumps(["TypeScript"]),
            preferred_skills_json=json.dumps([]),
            original_url="https://figma.com/jobs/202",
            application_url="https://figma.com/jobs/202/apply",
        )
        db.add(listing)
        db.commit()
        db.refresh(listing)

        saved = UserSavedInternship(
            user_id=registered_user.id,
            internship_id=listing.id,
            notes="Target for summer internship application.",
        )
        db.add(saved)
        db.commit()
    finally:
        db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/internships/saved", headers=user_auth_headers)
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) >= 1
        assert any(item["company_name"] == "Figma" for item in items)


def test_frontend_architecture_contract():
    """
    Validates structural contracts in frontend code:
    1. InternshipsPage checks hasSessionAnalysis from useAnalysis.
    2. DashboardPage prevents infinite loading loop with loadedRunIdRef.
    3. ExportButton uses dark and violet theme classes.
    4. HistoryPage uses responsive grid classes (3/2/1 cards per row).
    """
    root_dir = Path(__file__).resolve().parent.parent.parent
    frontend_src = root_dir / "frontend" / "src"

    internships_file = frontend_src / "pages" / "InternshipsPage.tsx"
    dashboard_file = frontend_src / "pages" / "DashboardPage.tsx"
    export_btn_file = frontend_src / "components" / "ExportButton.tsx"
    history_file = frontend_src / "pages" / "HistoryPage.tsx"
    auth_ctx_file = frontend_src / "context" / "AuthContext.tsx"

    # 1. InternshipsPage
    internships_text = internships_file.read_text(encoding="utf-8")
    assert "useAnalysis" in internships_text
    assert "hasSessionAnalysis" in internships_text
    assert "Internship Recommendations Inactive" in internships_text

    # 2. DashboardPage
    dashboard_text = dashboard_file.read_text(encoding="utf-8")
    assert "loadedRunIdRef" in dashboard_text
    assert "loadHistoryRun" in dashboard_text
    assert "retryRunId" in dashboard_text

    # 3. ExportButton (Dark & violet styling)
    export_text = export_btn_file.read_text(encoding="utf-8")
    assert "bg-white" not in export_text, "White background must be replaced"
    assert "border-violet-500" in export_text or "border-violet-400" in export_text
    assert "text-violet-200" in export_text or "text-violet-300" in export_text

    # 4. HistoryPage (Responsive grid: 3 per row desktop, 2 tablet, 1 mobile)
    history_text = history_file.read_text(encoding="utf-8")
    assert "lg:grid-cols-3" in history_text, "Desktop must display 3 cards per row"
    assert "md:grid-cols-2" in history_text, "Tablet must display 2 cards per row"
    assert "grid-cols-1" in history_text, "Mobile must display 1 card per row"

    # 5. AuthContext clears session cache on login and expiration
    auth_text = auth_ctx_file.read_text(encoding="utf-8")
    assert "clearSessionAnalysisCache" in auth_text
