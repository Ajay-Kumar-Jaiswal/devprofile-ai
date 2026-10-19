import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.services.url_validator import normalize_github_input
from app.models import RecommendationItem
from app.analyzer.reconciliation import reconcile_recommendations
from app.db_models import User, TrackedRecommendation, AnalysisRun

from tests.conftest import TestSession


def test_url_normalization_cases():
    # Valid formats
    assert normalize_github_input("octocat") == "octocat"
    assert normalize_github_input("@octocat") == "octocat"
    assert normalize_github_input("https://github.com/octocat") == "octocat"
    assert normalize_github_input("https://github.com/octocat/") == "octocat"
    assert normalize_github_input("http://github.com/octocat") == "octocat"
    assert normalize_github_input("github.com/octocat") == "octocat"
    assert normalize_github_input("www.github.com/octocat") == "octocat"
    assert normalize_github_input("https://www.github.com/torvalds/") == "torvalds"

    # Rejection of SSRF / arbitrary hosts
    with pytest.raises(Exception) as exc1:
        normalize_github_input("https://evil.com/octocat")
    assert "Only official GitHub profile URLs" in str(exc1.value)

    # Rejection of repository URLs
    with pytest.raises(Exception) as exc2:
        normalize_github_input("https://github.com/octocat/hello-world")
    assert "Repository URLs and deep paths are not accepted" in str(exc2.value)

    # Rejection of reserved system keywords
    with pytest.raises(Exception) as exc3:
        normalize_github_input("https://github.com/settings")
    assert "reserved GitHub system keyword" in str(exc3.value)


def test_recommendation_reconciliation_lifecycle():
    db = TestSession()
    user = User(email="test@user.com", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initial findings
    rec_bio = RecommendationItem(
        id="rec-profile-bio",
        priority="high",
        category="Branding",
        title="Craft a targeted 1-line professional bio",
        description="Missing bio",
        impact="Communicates focus",
        action="Add bio",
    )
    rec_desc = RecommendationItem(
        id="rec-repo-descriptions",
        priority="medium",
        category="Documentation",
        title="Add repository descriptions",
        description="Missing desc",
        impact="Clear context",
        action="Add descriptions",
    )

    # 1. First Run: initial detection
    tracked_1 = reconcile_recommendations(
        db=db,
        user_id=user.id,
        analyzed_login="octocat",
        current_findings=[rec_bio, rec_desc],
        is_live_data_reliable=True,
    )
    assert len(tracked_1) == 2
    assert all(t.status == "open" for t in tracked_1)
    assert all(t.recurrence_count == 0 for t in tracked_1)

    # Verify event logged
    assert len(tracked_1[0].events) == 1
    assert tracked_1[0].events[0].trigger_reason == "initial_detection"

    # 2. Second Run: unchanged data creates ZERO duplicates
    tracked_2 = reconcile_recommendations(
        db=db,
        user_id=user.id,
        analyzed_login="octocat",
        current_findings=[rec_bio, rec_desc],
        is_live_data_reliable=True,
    )
    # Total count in database remains 2
    total_db_count = db.query(TrackedRecommendation).filter(TrackedRecommendation.user_id == user.id).count()
    assert total_db_count == 2

    # 3. Third Run: User fixed their bio! (rec_bio no longer in findings)
    tracked_3 = reconcile_recommendations(
        db=db,
        user_id=user.id,
        analyzed_login="octocat",
        current_findings=[rec_desc],
        is_live_data_reliable=True,
    )
    bio_rec = db.query(TrackedRecommendation).filter(
        TrackedRecommendation.user_id == user.id,
        TrackedRecommendation.rule_id == "rec-profile-bio",
    ).first()
    assert bio_rec.status == "resolved"
    assert bio_rec.resolved_at is not None
    assert bio_rec.events[0].trigger_reason == "no_longer_detected"

    # 4. Fourth Run: User deleted their bio again (regression / recurring finding!)
    tracked_4 = reconcile_recommendations(
        db=db,
        user_id=user.id,
        analyzed_login="octocat",
        current_findings=[rec_bio, rec_desc],
        is_live_data_reliable=True,
    )
    db.refresh(bio_rec)
    assert bio_rec.status == "open"
    assert bio_rec.recurrence_count == 1
    assert bio_rec.events[0].trigger_reason == "reopened_recurring"

    # 5. Failed analysis (is_live_data_reliable=False) must NOT resolve issues
    # Suppose rec_desc omitted during a network glitch
    tracked_5 = reconcile_recommendations(
        db=db,
        user_id=user.id,
        analyzed_login="octocat",
        current_findings=[],
        is_live_data_reliable=False,  # Unreliable
    )
    desc_rec = db.query(TrackedRecommendation).filter(
        TrackedRecommendation.user_id == user.id,
        TrackedRecommendation.rule_id == "rec-repo-descriptions",
    ).first()
    assert desc_rec.status == "open"  # NOT resolved!

    db.close()


@pytest.mark.asyncio
async def test_authenticated_history_and_user_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register User A
        reg_a = await client.post(
            "/api/auth/register",
            json={"email": "usera@example.com", "password": "Password123!"},
        )
        token_a = reg_a.json()["token"]

        # Register User B
        reg_b = await client.post(
            "/api/auth/register",
            json={"email": "userb@example.com", "password": "Password123!"},
        )
        token_b = reg_b.json()["token"]

        # User A executes an analysis (demo mode)
        run_resp = await client.get(
            "/api/analyze/alex-dev-demo?demo=true",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert run_resp.status_code == 200

        # User A checks history
        hist_a = await client.get(
            "/api/history",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert hist_a.status_code == 200
        runs_a = hist_a.json()["runs"]
        assert len(runs_a) >= 1
        run_id = runs_a[0]["id"]

        # User A can fetch run detail
        detail_a = await client.get(
            f"/api/history/{run_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert detail_a.status_code == 200
        assert detail_a.json()["username"] == "alex-dev-demo"

        # User B CANNOT view User A's history or run detail (User Data Isolation)
        hist_b = await client.get(
            "/api/history",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert hist_b.status_code == 200
        assert hist_b.json()["total_runs"] == 0

        detail_b = await client.get(
            f"/api/history/{run_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert detail_b.status_code == 404  # Access denied / not found


@pytest.mark.asyncio
async def test_recommendation_status_manual_update():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register user and trigger demo analysis to seed recommendations
        reg = await client.post(
            "/api/auth/register",
            json={"email": "status@example.com", "password": "Password123!"},
        )
        token = reg.json()["token"]

        await client.get(
            "/api/analyze/alex-dev-demo?demo=true",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Get recommendations
        recs_resp = await client.get(
            "/api/recommendations",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert recs_resp.status_code == 200
        recs = recs_resp.json()
        assert len(recs) > 0
        rec_id = recs[0]["id"]

        # Dismiss recommendation
        dismiss_resp = await client.patch(
            f"/api/recommendations/{rec_id}/status",
            json={"status": "dismissed"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert dismiss_resp.status_code == 200
        assert dismiss_resp.json()["status"] == "dismissed"

        # Verify user CANNOT manually set status to resolved (requires live verification)
        invalid_resp = await client.patch(
            f"/api/recommendations/{rec_id}/status",
            json={"status": "resolved"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert invalid_resp.status_code in (400, 422)
