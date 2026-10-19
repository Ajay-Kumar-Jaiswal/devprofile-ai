import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from tests.conftest import TestSession
from app.main import app
from app.config import settings
from app.db_models import User, ConnectedGitHubAccount, AnalysisRun
from app.services.auth_service import hash_password, create_access_token
from app.services.github_service import github_service


@pytest.fixture
def authorized_user():
    """User whose GitHub username is on the allowlist."""
    db = TestSession()
    try:
        user = User(
            email="owner@personal.dev",
            hashed_password=hash_password("OwnerPassword123!"),
            full_name="Personal Owner",
            default_profile_username="personalowner",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@pytest.fixture
def authorized_headers(authorized_user):
    token = create_access_token({"sub": str(authorized_user.id), "email": authorized_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def unauthorized_user():
    """User whose GitHub username is NOT on the allowlist."""
    db = TestSession()
    try:
        user = User(
            email="stranger@somewhere.com",
            hashed_password=hash_password("StrangerPass123!"),
            full_name="Stranger Developer",
            default_profile_username="strangerdev",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@pytest.fixture
def unauthorized_headers(unauthorized_user):
    token = create_access_token({"sub": str(unauthorized_user.id), "email": unauthorized_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_demo_profile_accessible_without_authentication():
    """Requirement 1: Static demo profile analysis must be accessible without login or signup."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 'demo'
        resp_demo = await client.get("/api/analyze/demo")
        assert resp_demo.status_code == 200
        data_demo = resp_demo.json()
        assert data_demo["is_demo_data"] is True
        assert data_demo["username"] == "alex-dev-demo"

        # Test 'alex-dev-demo'
        resp_alex = await client.get("/api/analyze/alex-dev-demo")
        assert resp_alex.status_code == 200
        data_alex = resp_alex.json()
        assert data_alex["is_demo_data"] is True
        assert data_alex["username"] == "alex-dev-demo"

        # Test demo AI endpoint
        resp_ai = await client.post("/api/analyze/demo/ai")
        assert resp_ai.status_code == 200
        assert resp_ai.json()["status"] == "success"


@pytest.mark.asyncio
async def test_real_profile_analysis_rejected_without_authentication():
    """Requirement 4 & 5: Unauthenticated real profile analysis must be rejected with HTTP 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/analyze/octocat")
        assert resp.status_code == 401
        assert "Authentication required" in resp.json()["detail"]
        assert resp.headers.get("www-authenticate") == "Bearer"


@pytest.mark.asyncio
async def test_frontend_demo_flag_bypass_on_real_handle_is_rejected():
    """
    Requirement 7: A client cannot pass ?demo=true with a real handle to bypass authentication
    or retrieve fabricated real analysis data.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/analyze/octocat?demo=true")
        assert resp.status_code == 401
        assert "Authentication required" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_real_ai_analysis_rejected_without_authentication():
    """Real profile AI analysis must be rejected with HTTP 401 for unauthenticated clients."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/analyze/octocat/ai")
        assert resp.status_code == 401
        assert "Authentication required" in resp.json()["detail"]
        assert resp.headers.get("www-authenticate") == "Bearer"


@pytest.mark.asyncio
async def test_authenticated_user_can_analyze_real_profile(auth_headers):
    """Authenticated user with valid session can analyze real profiles."""
    mock_profile_json = {
        "login": "octocat",
        "name": "The Octocat",
        "avatar_url": "https://avatars.githubusercontent.com/u/583231",
        "html_url": "https://github.com/octocat",
        "bio": "GitHub mascot",
        "public_repos": 1,
        "followers": 100,
        "following": 0,
        "created_at": "2011-01-25T18:44:36Z",
    }
    mock_repos_json = [
        {
            "id": 1296269,
            "name": "Hello-World",
            "full_name": "octocat/Hello-World",
            "description": "My first repo on GitHub",
            "html_url": "https://github.com/octocat/Hello-World",
            "language": "Ruby",
            "stargazers_count": 2500,
            "forks_count": 2000,
            "open_issues_count": 5,
            "topics": ["tutorial"],
            "license": {"key": "mit", "name": "MIT License"},
            "fork": False,
            "created_at": "2011-01-26T19:01:12Z",
            "updated_at": "2026-10-01T00:00:00Z",
            "pushed_at": "2026-10-01T00:00:00Z",
        }
    ]

    with (
        patch.object(github_service, "fetch_profile", new_callable=AsyncMock) as mock_p,
        patch.object(github_service, "fetch_repositories", new_callable=AsyncMock) as mock_r,
    ):
        mock_p.return_value = mock_profile_json
        mock_r.return_value = mock_repos_json

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/analyze/octocat", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data["username"] == "octocat"
            assert data["is_demo_data"] is False
            assert data["portfolio_score"]["overall_score"] > 0


@pytest.mark.asyncio
async def test_invalid_or_expired_token_is_rejected():
    """Forged or malformed Bearer tokens must return HTTP 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Protected profile route
        resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid.token.signature"},
        )
        assert resp.status_code == 401
        assert "Session has expired or is invalid" in resp.json()["detail"]

        # Analysis route
        resp2 = await client.get(
            "/api/analyze/octocat",
            headers={"Authorization": "Bearer invalid.token.signature"},
        )
        assert resp2.status_code == 401


@pytest.mark.asyncio
async def test_private_endpoints_reject_unauthenticated_requests():
    """Requirement 10: Private history and recommendation endpoints reject unauthenticated access."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # History listing
        resp_hist = await client.get("/api/history")
        assert resp_hist.status_code == 401

        # History snapshot detail
        resp_run = await client.get("/api/history/123")
        assert resp_run.status_code == 401

        # Recommendations
        resp_recs = await client.get("/api/recommendations")
        assert resp_recs.status_code == 401

        # Current user profile
        resp_me = await client.get("/api/auth/me")
        assert resp_me.status_code == 401


@pytest.mark.asyncio
async def test_allowlist_permits_authorized_account(authorized_headers):
    """
    Requirement 8: If ALLOWED_GITHUB_ACCOUNTS is configured, authorized accounts
    can successfully access the personal instance.
    """
    settings.ALLOWED_GITHUB_ACCOUNTS = "personalowner,otheradmin"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/me", headers=authorized_headers)
        assert resp.status_code == 200
        assert resp.json()["default_profile_username"] == "personalowner"


@pytest.mark.asyncio
async def test_allowlist_rejects_unauthorized_account(unauthorized_headers):
    """
    Requirement 8: If ALLOWED_GITHUB_ACCOUNTS is configured, unauthorized accounts
    are rejected with HTTP 403 Forbidden.
    """
    settings.ALLOWED_GITHUB_ACCOUNTS = "personalowner,otheradmin"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Protected profile check
        resp = await client.get("/api/auth/me", headers=unauthorized_headers)
        assert resp.status_code == 403
        assert "restricted to authorized GitHub accounts" in resp.json()["detail"]

        # Analysis endpoint check
        resp_analyze = await client.get("/api/analyze/octocat", headers=unauthorized_headers)
        assert resp_analyze.status_code == 403
        assert "restricted to authorized GitHub accounts" in resp_analyze.json()["detail"]


@pytest.mark.asyncio
async def test_allowlist_case_insensitivity_and_whitespace():
    """Allowlist correctly normalizes casing and strips whitespace."""
    settings.ALLOWED_GITHUB_ACCOUNTS = "  PersonalOwner  , AdminUser  "
    assert settings.is_github_account_allowed("personalowner") is True
    assert settings.is_github_account_allowed("PERSONALOWNER") is True
    assert settings.is_github_account_allowed("PersonalOwner") is True
    assert settings.is_github_account_allowed("adminuser") is True
    assert settings.is_github_account_allowed("stranger") is False
    assert settings.is_github_account_allowed(None) is False
    assert settings.is_github_account_allowed("") is False


@pytest.mark.asyncio
async def test_user_data_isolation_between_accounts(authorized_headers, unauthorized_headers):
    """Verify that User A cannot access User B's historical snapshots."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Authorized user creates an analysis run via demo endpoint while logged in
        run_resp = await client.get(
            "/api/analyze/alex-dev-demo?demo=true",
            headers=authorized_headers,
        )
        assert run_resp.status_code == 200

        # Fetch authorized user's history
        hist_resp = await client.get("/api/history", headers=authorized_headers)
        assert hist_resp.status_code == 200
        runs = hist_resp.json()["runs"]
        assert len(runs) >= 1
        run_id = runs[0]["id"]

        # Authorized user can view snapshot detail
        resp_owner = await client.get(f"/api/history/{run_id}", headers=authorized_headers)
        assert resp_owner.status_code == 200
        assert resp_owner.json()["username"] == "alex-dev-demo"

        # Unauthorized user cannot view owner's snapshot detail (returns 404 Not Found)
        resp_other = await client.get(f"/api/history/{run_id}", headers=unauthorized_headers)
        assert resp_other.status_code == 404
