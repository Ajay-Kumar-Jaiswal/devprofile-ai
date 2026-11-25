import pytest
import jwt
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from app.main import app
from app.config import settings
from app.services.auth_service import create_access_token
from app.db_models import User
from tests.conftest import TestSession


@pytest.mark.asyncio
async def test_full_auth_lifecycle_register_verify_and_access(mock_resend_email):
    """
    Tests complete lifecycle:
    1. Register user
    2. Verify OTP and obtain JWT
    3. Access protected routes with the valid JWT
    4. Verify that non-security profile updates do NOT invalidate the JWT session
    5. Verify that password reset invalidates previous session tokens
    6. Verify expired tokens return 401 with WWW-Authenticate header
    7. Verify invalid signature tokens return 401 with WWW-Authenticate header
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register user
        reg_resp = await client.post(
            "/api/auth/register",
            json={
                "email": "lifecycle_test@example.com",
                "password": "StrongPassword123!",
                "full_name": "Ajay Kumar",
                "default_profile_username": "Ajay-Kumar-Jaiswal",
                "terms_accepted": True,
            },
        )
        assert reg_resp.status_code == 201
        otp_code = mock_resend_email[-1]["otp"]

        # 2. Verify OTP
        verify_resp = await client.post(
            "/api/auth/verify-otp",
            json={"email": "lifecycle_test@example.com", "otp": otp_code},
        )
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert "token" in verify_data
        token = verify_data["token"]
        assert token is not None

        auth_headers = {"Authorization": f"Bearer {token}"}

        # 3. Access protected /api/auth/me
        me_resp = await client.get("/api/auth/me", headers=auth_headers)
        assert me_resp.status_code == 200, f"Failed /api/auth/me: {me_resp.text}"
        me_data = me_resp.json()
        assert me_data["email"] == "lifecycle_test@example.com"
        assert me_data["is_verified"] is True
        assert me_data["default_profile_username"] == "Ajay-Kumar-Jaiswal"

        # 4. Access protected /api/internships/sources
        sources_resp = await client.get("/api/internships/sources", headers=auth_headers)
        assert sources_resp.status_code == 200, f"Failed /api/internships/sources: {sources_resp.text}"

        # 5. Access protected /api/auth/delete-account/request-otp
        del_otp_resp = await client.post("/api/auth/delete-account/request-otp", headers=auth_headers)
        assert del_otp_resp.status_code == 200, f"Failed delete-account/request-otp: {del_otp_resp.text}"

        # 6. Verify demo profile analysis works for authenticated user
        demo_resp = await client.get("/api/analyze/demo?demo=true", headers=auth_headers)
        assert demo_resp.status_code == 200
        assert demo_resp.json()["is_demo_data"] is True

        # 7. Non-security updates: Simulate user.updated_at changing (e.g. clock skew, profile edits)
        db = TestSession()
        try:
            u = db.query(User).filter(User.email == "lifecycle_test@example.com").first()
            u.updated_at = datetime.now(timezone.utc) + timedelta(minutes=5)
            u.default_profile_username = "Ajay-Updated"
            db.commit()
        finally:
            db.close()

        # The issued token MUST REMAIN VALID because password did not change!
        me_after_update = await client.get("/api/auth/me", headers=auth_headers)
        assert me_after_update.status_code == 200
        assert me_after_update.json()["default_profile_username"] == "Ajay-Updated"

        sources_after_update = await client.get("/api/internships/sources", headers=auth_headers)
        assert sources_after_update.status_code == 200

        # 8. Password reset invalidates prior session tokens
        # Request password reset
        forgot_resp = await client.post(
            "/api/auth/forgot-password",
            json={"email": "lifecycle_test@example.com"},
        )
        assert forgot_resp.status_code == 200
        reset_otp = mock_resend_email[-1]["otp"]

        # Verify reset OTP to get reset token
        verify_reset_resp = await client.post(
            "/api/auth/verify-reset-otp",
            json={"email": "lifecycle_test@example.com", "otp": reset_otp},
        )
        assert verify_reset_resp.status_code == 200
        reset_token = verify_reset_resp.json()["reset_token"]

        # Reset password
        reset_pwd_resp = await client.post(
            "/api/auth/reset-password",
            json={
                "email": "lifecycle_test@example.com",
                "reset_token": reset_token,
                "new_password": "BrandNewPassword456!",
            },
        )
        assert reset_pwd_resp.status_code == 200

        # Now the OLD token MUST BE REJECTED with 401
        revoked_resp = await client.get("/api/auth/me", headers=auth_headers)
        assert revoked_resp.status_code == 401
        assert "WWW-Authenticate" in revoked_resp.headers
        assert "revoked" in revoked_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_expired_token_handling():
    """Verifies that expired JWT tokens return HTTP 401 with WWW-Authenticate header."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create an expired token (1 hour in the past)
        expired_token = create_access_token(
            {"sub": "999", "email": "test@example.com"},
            expires_delta=timedelta(hours=-1),
        )

        resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert resp.status_code == 401
        assert "WWW-Authenticate" in resp.headers
        assert "expired" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invalid_signature_and_malformed_tokens():
    """Verifies that forged or corrupted JWT tokens return HTTP 401 with WWW-Authenticate header."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Forged token with different secret key
        forged_token = jwt.encode(
            {"sub": "1", "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())},
            "completely-wrong-secret-key",
            algorithm=settings.ALGORITHM,
        )

        resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {forged_token}"},
        )
        assert resp.status_code == 401
        assert "WWW-Authenticate" in resp.headers

        # Completely garbage malformed token
        malformed_resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer not.a.real.jwt.token"},
        )
        assert malformed_resp.status_code == 401
        assert "WWW-Authenticate" in malformed_resp.headers


@pytest.mark.asyncio
async def test_case_insensitive_bearer_header():
    """Verifies that lowercase 'bearer' authorization header is supported."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        db = TestSession()
        try:
            u = db.query(User).first()
            if not u:
                u = User(email="bearer_case@example.com", is_active=True, is_verified=True)
                db.add(u)
                db.commit()
                db.refresh(u)
            uid = u.id
        finally:
            db.close()

        valid_token = create_access_token({"sub": str(uid)})
        # Test lowercase 'bearer'
        resp = await client.get(
            "/api/auth/me",
            headers={"authorization": f"bearer {valid_token}"},
        )
        assert resp.status_code == 200
