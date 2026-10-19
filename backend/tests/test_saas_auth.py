import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.config import settings
from app.database import Base, get_db
from app.db_models import User, ConnectedGitHubAccount, OAuthState




@pytest.mark.asyncio
async def test_user_registration_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "email": "developer@example.com",
            "password": "Password123!",
            "full_name": "Alex Developer",
            "default_profile_username": "https://github.com/octocat/",
        }
        resp = await client.post("/api/auth/register", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["user"]["email"] == "developer@example.com"
        assert data["user"]["full_name"] == "Alex Developer"
        assert data["user"]["default_profile_username"] == "octocat"
        assert "token" in data
        assert "devprofile_session" in resp.cookies


@pytest.mark.asyncio
async def test_user_registration_duplicate_email():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "email": "duplicate@example.com",
            "password": "Password123!",
            "full_name": "Dev One",
        }
        resp1 = await client.post("/api/auth/register", json=payload)
        assert resp1.status_code == 201

        # Second registration with same email
        resp2 = await client.post("/api/auth/register", json=payload)
        assert resp2.status_code == 409
        assert "already exists" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_user_registration_short_password():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "email": "short@example.com",
            "password": "123",
        }
        resp = await client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_user_login_success_and_logout():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register
        await client.post(
            "/api/auth/register",
            json={"email": "login@example.com", "password": "SecurePassword123"},
        )

        # Login
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": "login@example.com", "password": "SecurePassword123"},
        )
        assert login_resp.status_code == 200
        data = login_resp.json()
        token = data["token"]
        assert token

        # Verify /me with Bearer token
        me_resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "login@example.com"

        # Logout
        logout_resp = await client.post("/api/auth/logout")
        assert logout_resp.status_code == 200


@pytest.mark.asyncio
async def test_user_login_invalid_credentials_generic_message():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register user
        await client.post(
            "/api/auth/register",
            json={"email": "real@example.com", "password": "RealPassword123"},
        )

        # Try wrong password
        resp1 = await client.post(
            "/api/auth/login",
            json={"email": "real@example.com", "password": "WrongPassword!"},
        )
        assert resp1.status_code == 401
        assert resp1.json()["detail"] == "Invalid email or password."

        # Try non-existent email
        resp2 = await client.post(
            "/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "SomePassword!"},
        )
        assert resp2.status_code == 401
        assert resp2.json()["detail"] == "Invalid email or password."


@pytest.mark.asyncio
async def test_protected_endpoints_reject_unauthenticated():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401
        assert "Authentication required" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_github_oauth_url_unconfigured_state():
    settings.GITHUB_CLIENT_ID = None
    settings.GITHUB_CLIENT_SECRET = None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/github/url")
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_configured"] is False
        assert "setup_instructions" in data
        assert "GITHUB_CLIENT_ID" in data["setup_instructions"]


@pytest.mark.asyncio
async def test_github_oauth_url_configured_state():
    settings.GITHUB_CLIENT_ID = "mock_client_id_123"
    settings.GITHUB_CLIENT_SECRET = "mock_client_secret_abc"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/github/url")
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_configured"] is True
        assert "https://github.com/login/oauth/authorize" in data["auth_url"]
        assert "client_id=mock_client_id_123" in data["auth_url"]
        assert "state=" in data["auth_url"]


@pytest.mark.asyncio
async def test_forgot_password_documents_infrastructure_prerequisites():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/forgot-password",
            json={"email": "reset@example.com"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["requires_email_service"] is True
        assert "SMTP" in data["documentation"]


@pytest.mark.asyncio
async def test_github_oauth_callback_post_requires_valid_state():
    settings.GITHUB_CLIENT_ID = "mock_client_id_123"
    settings.GITHUB_CLIENT_SECRET = "mock_client_secret_abc"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/github/callback",
            json={"code": "sample_code", "state": "invalid_fake_state"},
        )
        # Should be 400 Bad Request for invalid state, NOT 405 Method Not Allowed
        assert resp.status_code == 400
        assert "Invalid or expired OAuth state" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_github_oauth_callback_get_handles_missing_params_with_redirect():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/github/callback", follow_redirects=False)
        # Must return 303 redirect, NEVER 405 Method Not Allowed
        assert resp.status_code == 303
        assert "/login?oauth_error=" in resp.headers["Location"]


@pytest.mark.asyncio
async def test_github_oauth_callback_get_handles_error_query_with_redirect():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/auth/github/callback?error=access_denied&error_description=The+user+has+denied+your+application+access.",
            follow_redirects=False,
        )
        assert resp.status_code == 303
        assert "access." in resp.headers["Location"] or "access_denied" in resp.headers["Location"]


def test_oauth_state_lifecycle_valid_mismatched_expired_and_consumed():
    from datetime import datetime, timedelta, timezone
    from app.services.auth_service import (
        generate_oauth_state,
        verify_and_consume_oauth_state,
        check_oauth_state_status,
    )
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        # 1. Valid state test
        token = generate_oauth_state(db)
        assert check_oauth_state_status(db, token) == "valid"
        verified = verify_and_consume_oauth_state(db, token)
        assert verified is not None
        assert verified.state_token == token
        assert verified.consumed_at is not None

        # 2. Already-consumed state test (replay attack attempt with same token)
        assert check_oauth_state_status(db, token) == "already_consumed"
        replayed = verify_and_consume_oauth_state(db, token)
        assert replayed is None

        # 3. Mismatched state test (token never created in database)
        assert check_oauth_state_status(db, "completely_nonexistent_token") == "mismatched"
        mismatched = verify_and_consume_oauth_state(db, "completely_nonexistent_token")
        assert mismatched is None

        # 4. Expired state test
        expired_token = "expired_token_" + token[:10]
        now = datetime.now(timezone.utc)
        expired_obj = OAuthState(
            state_token=expired_token,
            created_at=now - timedelta(minutes=30),
            expires_at=now - timedelta(minutes=15),
            consumed_at=None,
        )
        db.add(expired_obj)
        db.commit()

        assert check_oauth_state_status(db, expired_token) == "expired"
        expired_result = verify_and_consume_oauth_state(db, expired_token)
        assert expired_result is None
        # Once expired check runs, it is marked as consumed
        assert check_oauth_state_status(db, expired_token) == "already_consumed"
    finally:
        db.close()


@pytest.mark.asyncio
async def test_github_oauth_callback_rejects_already_consumed_state():
    from app.services.auth_service import generate_oauth_state, verify_and_consume_oauth_state
    from app.database import SessionLocal

    settings.GITHUB_CLIENT_ID = "mock_client_id_123"
    settings.GITHUB_CLIENT_SECRET = "mock_client_secret_abc"

    db = SessionLocal()
    token = generate_oauth_state(db)
    # First consumption succeeds
    first_verify = verify_and_consume_oauth_state(db, token)
    assert first_verify is not None
    db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Second call to POST /api/auth/github/callback with same state must be rejected with 400
        resp = await client.post(
            "/api/auth/github/callback",
            json={"code": "mock_code", "state": token},
        )
        assert resp.status_code == 400
        assert "Invalid or expired OAuth state parameter" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_disconnect_github_account_success():
    from app.services.auth_service import hash_password, create_access_token
    from tests.conftest import TestSession as SessionLocal
    db = SessionLocal()
    # Create user with password and connected github
    user = User(
        email="disconnect_test@example.com",
        hashed_password=hash_password("ValidPassword123!"),
        full_name="Disconnect Dev",
        default_profile_username="disconnect_dev",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    conn = ConnectedGitHubAccount(
        user_id=user.id,
        github_user_id=778899,
        github_login="disconnect_dev",
        avatar_url="https://avatars.githubusercontent.com/u/778899",
        html_url="https://github.com/disconnect_dev",
    )
    db.add(conn)
    db.commit()
    token = create_access_token({"sub": str(user.id), "email": user.email})
    db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Verify before disconnect /me returns connected_github
        me_before = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_before.status_code == 200
        assert me_before.json()["connected_github"] is not None
        assert me_before.json()["connected_github"]["github_login"] == "disconnect_dev"

        # 2. Call disconnect endpoint
        disc_resp = await client.post(
            "/api/auth/github/disconnect",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert disc_resp.status_code == 200
        disc_data = disc_resp.json()
        assert "safely" in disc_data["message"]
        assert disc_data["user"]["connected_github"] is None
        assert disc_data["user"]["default_profile_username"] is None

        # 3. Verify /me now immediately returns connected_github is None and no-cache header
        me_after = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_after.status_code == 200
        assert me_after.json()["connected_github"] is None
        assert me_after.json()["default_profile_username"] is None
        assert "no-store" in me_after.headers.get("Cache-Control", "")

    # 4. Verify in DB row is deleted
    db2 = SessionLocal()
    conn_in_db = db2.query(ConnectedGitHubAccount).filter(ConnectedGitHubAccount.user_id == user.id).first()
    assert conn_in_db is None
    db2.close()


@pytest.mark.asyncio
async def test_disconnect_github_account_safeguard_prevents_lockout():
    from app.services.auth_service import create_access_token
    from tests.conftest import TestSession as SessionLocal
    db = SessionLocal()
    # User created solely via OAuth (no hashed_password)
    user = User(
        email="oauth_only@example.com",
        hashed_password=None,
        full_name="OAuth Only Dev",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    conn = ConnectedGitHubAccount(
        user_id=user.id,
        github_user_id=556677,
        github_login="oauth_only_dev",
    )
    db.add(conn)
    db.commit()
    token = create_access_token({"sub": str(user.id), "email": user.email})
    db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Attempt to disconnect without password set
        resp = await client.post(
            "/api/auth/github/disconnect",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400
        assert "must set an email and password first" in resp.json()["detail"]

    # Verify connected account was NOT deleted
    db2 = SessionLocal()
    conn_in_db = db2.query(ConnectedGitHubAccount).filter(ConnectedGitHubAccount.user_id == user.id).first()
    assert conn_in_db is not None
    db2.close()


@pytest.mark.asyncio
async def test_disconnect_when_no_account_connected():
    from app.services.auth_service import hash_password, create_access_token
    from tests.conftest import TestSession as SessionLocal
    db = SessionLocal()
    user = User(
        email="standalone@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Standalone Dev",
        is_active=True,
    )
    db.add(user)
    db.commit()
    token = create_access_token({"sub": str(user.id), "email": user.email})
    db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/github/disconnect",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400
        assert "No GitHub account is currently connected" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_manual_public_profile_analysis_after_disconnect():
    from app.services.auth_service import hash_password, create_access_token
    from tests.conftest import TestSession as SessionLocal
    db = SessionLocal()
    user = User(
        email="public_analyzer@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Public Analyzer",
        is_active=True,
    )
    db.add(user)
    db.commit()
    token = create_access_token({"sub": str(user.id), "email": user.email})
    db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Analyze a public profile using demo mode
        resp = await client.get(
            "/api/analyze/alex-dev-demo?demo=true",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "alex-dev-demo"
        assert "portfolio_score" in data
        assert data["portfolio_score"]["overall_score"] > 0

        # Verify analysis run was recorded in user's history
        history_resp = await client.get(
            "/api/history",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert history_resp.status_code == 200
        history_data = history_resp.json()
        assert history_data["total_runs"] >= 1
        assert history_data["runs"][0]["analyzed_login"] == "alex-dev-demo"

        # Verify user still has no connected GitHub account
        me_resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.json()["connected_github"] is None


@pytest.mark.asyncio
async def test_change_password_success_and_subsequent_login():
    """Verify password change with valid current password updates credentials."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register user with initial password
        reg_resp = await client.post(
            "/api/auth/register",
            json={"email": "pwd_user@example.com", "password": "InitialPassword123!"},
        )
        assert reg_resp.status_code == 201
        token = reg_resp.json()["token"]

        # Change password
        change_resp = await client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "InitialPassword123!",
                "new_password": "UpdatedPassword456!",
            },
        )
        assert change_resp.status_code == 200
        assert change_resp.json()["message"] == "Password changed successfully."

        # Verify old password no longer works
        old_login = await client.post(
            "/api/auth/login",
            json={"email": "pwd_user@example.com", "password": "InitialPassword123!"},
        )
        assert old_login.status_code == 401

        # Verify new password succeeds
        new_login = await client.post(
            "/api/auth/login",
            json={"email": "pwd_user@example.com", "password": "UpdatedPassword456!"},
        )
        assert new_login.status_code == 200
        assert "token" in new_login.json()


@pytest.mark.asyncio
async def test_change_password_incorrect_current_password():
    """Verify change-password rejects incorrect current password."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        reg_resp = await client.post(
            "/api/auth/register",
            json={"email": "wrong_pwd@example.com", "password": "CorrectPassword123!"},
        )
        token = reg_resp.json()["token"]

        change_resp = await client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "WrongPassword999!",
                "new_password": "AnotherPassword456!",
            },
        )
        assert change_resp.status_code == 400
        assert "Current password is incorrect" in change_resp.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_same_new_password_rejected():
    """Verify change-password rejects new password matching current password."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        reg_resp = await client.post(
            "/api/auth/register",
            json={"email": "same_pwd@example.com", "password": "MySamePassword123!"},
        )
        token = reg_resp.json()["token"]

        change_resp = await client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "MySamePassword123!",
                "new_password": "MySamePassword123!",
            },
        )
        assert change_resp.status_code == 400
        assert "New password must be different from your current password" in change_resp.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_short_new_password_rejected():
    """Verify change-password rejects passwords under 8 characters."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        reg_resp = await client.post(
            "/api/auth/register",
            json={"email": "short_pwd@example.com", "password": "MyValidPassword123!"},
        )
        token = reg_resp.json()["token"]

        change_resp = await client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "MyValidPassword123!",
                "new_password": "short",
            },
        )
        assert change_resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_change_password_unauthenticated_rejected():
    """Verify unauthenticated calls to change-password return HTTP 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/change-password",
            json={
                "current_password": "AnyPassword123!",
                "new_password": "NewPassword456!",
            },
        )
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_change_password_oauth_only_account_rejected():
    """Verify change-password rejects accounts that only authenticated via GitHub OAuth without a local password."""
    from tests.conftest import TestSession as SessionLocal
    from app.services.auth_service import create_access_token

    db = SessionLocal()
    oauth_user = User(
        email="oauth_user@example.com",
        hashed_password=None,  # No local password!
        full_name="OAuth Developer",
        is_active=True,
    )
    db.add(oauth_user)
    db.commit()
    token = create_access_token({"sub": str(oauth_user.id), "email": oauth_user.email})
    db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # UserOut should report has_password=False
        me_resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["has_password"] is False

        # Attempting change-password must be rejected
        change_resp = await client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "SomePassword123!",
                "new_password": "NewPassword456!",
            },
        )
        assert change_resp.status_code == 400
        assert "GitHub OAuth" in change_resp.json()["detail"]


@pytest.mark.asyncio
async def test_user_out_reports_has_password_true_for_password_users():
    """Verify UserOut schema reports has_password=True for email/password users."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        reg_resp = await client.post(
            "/api/auth/register",
            json={"email": "has_pwd_user@example.com", "password": "ValidPassword123!"},
        )
        assert reg_resp.status_code == 201
        data = reg_resp.json()
        assert data["user"]["has_password"] is True


