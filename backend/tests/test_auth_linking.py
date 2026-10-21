import pytest
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config import settings
from app.db_models import User, ConnectedGitHubAccount, OAuthState, utcnow
from app.services.auth_service import hash_password, create_access_token
from tests.conftest import TestSession


class MockResponse:
    def __init__(self, status_code: int, json_data: dict):
        self.status_code = status_code
        self._json_data = json_data
        self.text = json.dumps(json_data)

    def json(self):
        return self._json_data


@pytest.fixture(autouse=True)
def configure_github_oauth():
    old_id = settings.GITHUB_CLIENT_ID
    old_sec = settings.GITHUB_CLIENT_SECRET
    settings.GITHUB_CLIENT_ID = "mock_client_id_123"
    settings.GITHUB_CLIENT_SECRET = "mock_client_secret_abc"
    yield
    settings.GITHUB_CLIENT_ID = old_id
    settings.GITHUB_CLIENT_SECRET = old_sec


@pytest.mark.asyncio
async def test_get_github_link_url_unauthenticated():
    """Unauthenticated users cannot initiate GitHub account linking."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/github/link-url")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_github_link_url_authenticated():
    """Authenticated email/password user can obtain a CSRF-protected linking URL bound to their user ID."""
    db = TestSession()
    try:
        user = User(
            email="linktest@example.com",
            hashed_password=hash_password("Password123!"),
            full_name="Link Candidate",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()

    token = create_access_token({"sub": str(user_id), "email": "linktest@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/github/link-url", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_configured"] is True
        assert "github.com/login/oauth/authorize" in data["auth_url"]
        assert "client_id=mock_client_id_123" in data["auth_url"]

    # Verify state record in DB is bound to user_id
    db = TestSession()
    try:
        state_record = db.query(OAuthState).filter(OAuthState.user_id == user_id).first()
        assert state_record is not None
        assert state_record.user_id == user_id
    finally:
        db.close()


@pytest.mark.asyncio
async def test_get_github_link_url_already_linked():
    """User who already has a connected GitHub account receives 400 Bad Request."""
    db = TestSession()
    try:
        user = User(
            email="already_linked@example.com",
            hashed_password=hash_password("Password123!"),
            full_name="Already Linked",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id

        conn = ConnectedGitHubAccount(
            user_id=user_id,
            github_user_id=123456,
            github_login="existing_gh_user",
        )
        db.add(conn)
        db.commit()
    finally:
        db.close()

    token = create_access_token({"sub": str(user_id), "email": "already_linked@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/github/link-url", headers=headers)
        assert resp.status_code == 400
        assert "connected github identity" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_link_callback_invalid_state():
    """Reject linking callback when state is missing or invalid."""
    db = TestSession()
    try:
        user = User(
            email="invalid_state@example.com",
            hashed_password=hash_password("Password123!"),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()

    token = create_access_token({"sub": str(user_id), "email": "invalid_state@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/github/link-callback",
            headers=headers,
            json={"code": "dummy_code", "state": "non_existent_state_nonce"},
        )
        assert resp.status_code == 400
        assert "invalid or expired" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_link_callback_state_ownership_mismatch():
    """Reject linking callback when OAuth state belongs to another user (403 Forbidden)."""
    db = TestSession()
    try:
        user_a = User(email="usera@example.com", is_active=True)
        user_b = User(email="userb@example.com", is_active=True)
        db.add_all([user_a, user_b])
        db.commit()
        db.refresh(user_a)
        db.refresh(user_b)
        user_a_id = user_a.id
        user_b_id = user_b.id

        state = OAuthState(
            state_token="state_for_user_a",
            user_id=user_a_id,
            expires_at=utcnow() + timedelta(minutes=10),
        )
        db.add(state)
        db.commit()
    finally:
        db.close()

    token_b = create_access_token({"sub": str(user_b_id), "email": "userb@example.com"})
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/github/link-callback",
            headers=headers_b,
            json={"code": "dummy_code", "state": "state_for_user_a"},
        )
        assert resp.status_code == 403
        assert "different user" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_link_callback_conflict_when_github_identity_already_linked():
    """Reject linking when GitHub identity is already attached to another account (409 Conflict)."""
    db = TestSession()
    try:
        existing_user = User(
            email="existing_holder@example.com",
            is_active=True,
        )
        db.add(existing_user)
        db.commit()
        db.refresh(existing_user)

        conn = ConnectedGitHubAccount(
            user_id=existing_user.id,
            github_user_id=55555,
            github_login="existing_holder",
        )
        db.add(conn)

        victim_user = User(
            email="victim@example.com",
            hashed_password=hash_password("Secret123"),
            is_active=True,
        )
        db.add(victim_user)
        db.commit()
        db.refresh(victim_user)
        victim_id = victim_user.id

        state = OAuthState(
            state_token="conflict_state_123",
            user_id=victim_id,
            expires_at=utcnow() + timedelta(minutes=10),
        )
        db.add(state)
        db.commit()
    finally:
        db.close()

    token = create_access_token({"sub": str(victim_id), "email": "victim@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    async def mock_get(url, *args, **kwargs):
        if str(url).endswith("/user"):
            return MockResponse(200, {
                "id": 55555,
                "login": "existing_holder",
                "avatar_url": "https://avatars.githubusercontent.com/u/55555",
                "html_url": "https://github.com/existing_holder",
            })
        if str(url).endswith("/user/emails"):
            return MockResponse(200, [{"email": "existing_holder@example.com", "primary": True, "verified": True}])
        return MockResponse(404, {})

    mock_client = AsyncMock()
    mock_client.post.return_value = MockResponse(200, {"access_token": "gho_mock_token_123"})
    mock_client.get.side_effect = mock_get

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.routers.auth.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__.return_value = mock_client
            resp = await client.post(
                "/api/auth/github/link-callback",
                headers=headers,
                json={"code": "valid_code", "state": "conflict_state_123"},
            )
            assert resp.status_code == 409
            assert "already linked to another" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_link_callback_success_preserves_email_and_credentials():
    """Successful linking attaches GitHub identity without overwriting the user's primary login email."""
    db = TestSession()
    try:
        original_email = "primary_coder@acme.org"
        user = User(
            email=original_email,
            hashed_password=hash_password("OriginalPassword123!"),
            full_name="Primary Coder",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id

        state = OAuthState(
            state_token="valid_linking_state_777",
            user_id=user_id,
            expires_at=utcnow() + timedelta(minutes=10),
        )
        db.add(state)
        db.commit()
    finally:
        db.close()

    token = create_access_token({"sub": str(user_id), "email": original_email})
    headers = {"Authorization": f"Bearer {token}"}

    async def mock_get(url, *args, **kwargs):
        if str(url).endswith("/user"):
            return MockResponse(200, {
                "id": 777888,
                "login": "octocandidate",
                "name": "Octo Candidate",
                "avatar_url": "https://avatars.githubusercontent.com/u/777888",
                "html_url": "https://github.com/octocandidate",
            })
        if str(url).endswith("/user/emails"):
            return MockResponse(200, [{"email": "different_github_email@example.com", "primary": True, "verified": True}])
        return MockResponse(404, {})

    mock_client = AsyncMock()
    mock_client.post.return_value = MockResponse(200, {"access_token": "gho_mock_token_777"})
    mock_client.get.side_effect = mock_get

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.routers.auth.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__.return_value = mock_client
            resp = await client.post(
                "/api/auth/github/link-callback",
                headers=headers,
                json={"code": "valid_oauth_code", "state": "valid_linking_state_777"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["user"]["email"] == original_email
            assert data["user"]["connected_github"]["github_login"] == "octocandidate"
            assert data["user"]["connected_github"]["github_user_id"] == 777888

    # Verify database persistence
    db = TestSession()
    try:
        updated = db.query(User).filter(User.id == user_id).first()
        assert updated.email == original_email  # MUST preserve original login email
        assert updated.hashed_password is not None
        assert updated.connected_github is not None
        assert updated.connected_github.github_user_id == 777888
        assert updated.connected_github.github_login == "octocandidate"
    finally:
        db.close()


@pytest.mark.asyncio
async def test_direct_get_callback_linking_redirect():
    """Verify standard GET /api/auth/github/callback detects linking flow and redirects to settings."""
    db = TestSession()
    try:
        user = User(
            email="direct_redirect@example.com",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id

        state = OAuthState(
            state_token="direct_get_state_999",
            user_id=user_id,
            expires_at=utcnow() + timedelta(minutes=10),
        )
        db.add(state)
        db.commit()
    finally:
        db.close()

    async def mock_get(url, *args, **kwargs):
        if str(url).endswith("/user"):
            return MockResponse(200, {
                "id": 999111,
                "login": "directghuser",
                "avatar_url": "https://avatars.githubusercontent.com/u/999111",
                "html_url": "https://github.com/directghuser",
            })
        if str(url).endswith("/user/emails"):
            return MockResponse(200, [])
        return MockResponse(404, {})

    mock_client = AsyncMock()
    mock_client.post.return_value = MockResponse(200, {"access_token": "gho_mock_token_999"})
    mock_client.get.side_effect = mock_get

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.routers.auth.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__.return_value = mock_client
            resp = await client.get(
                "/api/auth/github/callback?code=direct_code&state=direct_get_state_999",
                follow_redirects=False,
            )
            assert resp.status_code in (302, 303, 307)
            location = resp.headers.get("location", "")
            assert "/settings?github_linked=success&login=directghuser" in location
