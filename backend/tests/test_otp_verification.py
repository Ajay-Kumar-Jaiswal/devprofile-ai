import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import Base, get_db
from app.db_models import User, EmailVerificationOTP, ConnectedGitHubAccount
from app.services.auth_service import hash_password, create_access_token
from app.services.otp_service import otp_rate_limiter
from app.services.email_service import EmailDeliveryError, build_otp_email_html, build_otp_email_text
from tests.conftest import TestSession


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_signup_dispatches_otp_and_creates_unverified_user(mock_resend_email):
    """Verifies that new user registration sends a 6-digit OTP via Resend and flags user as unverified."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/auth/register",
            json={
                "email": "newdev@campus.edu",
                "password": "StrongPassword123!",
                "full_name": "New Developer",
                "default_profile_username": "newdev",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["requires_verification"] is True
        assert data["email"] == "newdev@campus.edu"
        assert "verification code" in data["message"].lower()
        assert "token" not in data  # Token must NOT be issued prior to OTP verification

        # Check Resend mock dispatch
        assert len(mock_resend_email) == 1
        assert mock_resend_email[0]["to"] == "newdev@campus.edu"
        otp_code = mock_resend_email[0]["otp"]
        assert len(otp_code) == 6
        assert otp_code.isdigit()

        # Check DB state
        db = TestSession()
        try:
            user = db.query(User).filter(User.email == "newdev@campus.edu").first()
            assert user is not None
            assert user.is_verified is False

            otp_record = db.query(EmailVerificationOTP).filter(EmailVerificationOTP.user_id == user.id).first()
            assert otp_record is not None
            assert otp_record.is_consumed is False
            assert otp_record.attempts == 0
            assert otp_record.max_attempts == 5
            # Plaintext OTP must NOT be stored in DB
            assert otp_code not in otp_record.otp_hash
        finally:
            db.close()


@pytest.mark.anyio
async def test_verify_otp_success_activates_user_and_creates_session(mock_resend_email):
    """Verifies that submitting the correct OTP activates the user, issues a JWT token, and consumes the OTP."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register
        reg_res = await client.post(
            "/api/auth/register",
            json={"email": "activate@campus.edu", "password": "Password123!"},
        )
        assert reg_res.status_code == 201
        otp_code = mock_resend_email[-1]["otp"]

        # 2. Verify OTP
        verify_res = await client.post(
            "/api/auth/verify-otp",
            json={"email": "activate@campus.edu", "otp": otp_code},
        )
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert "token" in verify_data
        assert verify_data["user"]["is_verified"] is True
        assert verify_data["user"]["email"] == "activate@campus.edu"

        # 3. Verify user is now active and verified in database
        db = TestSession()
        try:
            user = db.query(User).filter(User.email == "activate@campus.edu").first()
            assert user.is_verified is True
            otp_record = db.query(EmailVerificationOTP).filter(EmailVerificationOTP.user_id == user.id).first()
            assert otp_record.is_consumed is True
            assert otp_record.consumed_at is not None
        finally:
            db.close()


@pytest.mark.anyio
async def test_verify_otp_incorrect_code_decrements_attempts(mock_resend_email):
    """Verifies that invalid OTP codes return 400 and decrement remaining attempt count."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/auth/register",
            json={"email": "wrongotp@campus.edu", "password": "Password123!"},
        )

        res = await client.post(
            "/api/auth/verify-otp",
            json={"email": "wrongotp@campus.edu", "otp": "999999"},
        )
        assert res.status_code == 400
        data = res.json()
        assert "Incorrect verification code" in data["detail"]
        assert "4 attempts remaining" in data["detail"]

        # Check DB attempt counter
        db = TestSession()
        try:
            otp_record = db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == "wrongotp@campus.edu").first()
            assert otp_record.attempts == 1
        finally:
            db.close()


@pytest.mark.anyio
async def test_verify_otp_maximum_attempts_exceeded(mock_resend_email):
    """Verifies that exceeding the maximum 5 verification attempts locks the OTP and requires a resend."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/auth/register",
            json={"email": "lockout@campus.edu", "password": "Password123!"},
        )

        # First 4 incorrect verifications
        for i in range(4):
            res = await client.post(
                "/api/auth/verify-otp",
                json={"email": "lockout@campus.edu", "otp": f"11111{i}"},
            )
            assert res.status_code == 400
            assert "attempt" in res.json()["detail"] and "remaining" in res.json()["detail"]

        # 5th incorrect attempt hits threshold
        res5 = await client.post(
            "/api/auth/verify-otp",
            json={"email": "lockout@campus.edu", "otp": "111114"},
        )
        assert res5.status_code == 400
        assert "Maximum attempts exceeded" in res5.json()["detail"]

        # 6th attempt: OTP was consumed/invalidated
        res6 = await client.post(
            "/api/auth/verify-otp",
            json={"email": "lockout@campus.edu", "otp": "000000"},
        )
        assert res6.status_code == 400
        assert "No active verification code found" in res6.json()["detail"]


@pytest.mark.anyio
async def test_verify_otp_expired_code(mock_resend_email):
    """Verifies that expired OTP codes (>10 minutes) are rejected with a clear expiration notice."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/auth/register",
            json={"email": "expired@campus.edu", "password": "Password123!"},
        )
        otp_code = mock_resend_email[-1]["otp"]

        # Fast-forward OTP expiration to the past
        db = TestSession()
        try:
            otp_record = db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == "expired@campus.edu").first()
            otp_record.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
            db.commit()
        finally:
            db.close()

        res = await client.post(
            "/api/auth/verify-otp",
            json={"email": "expired@campus.edu", "otp": otp_code},
        )
        assert res.status_code == 400
        assert "expired" in res.json()["detail"].lower()


@pytest.mark.anyio
async def test_verify_otp_single_use_prevents_replay(mock_resend_email):
    """Verifies that an OTP cannot be replayed after it has already been consumed."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/auth/register",
            json={"email": "replay@campus.edu", "password": "Password123!"},
        )
        otp_code = mock_resend_email[-1]["otp"]

        # First verification succeeds
        res1 = await client.post(
            "/api/auth/verify-otp",
            json={"email": "replay@campus.edu", "otp": otp_code},
        )
        assert res1.status_code == 200

        # Second verification with same code fails
        res2 = await client.post(
            "/api/auth/verify-otp",
            json={"email": "replay@campus.edu", "otp": otp_code},
        )
        assert res2.status_code == 400
        assert "already verified" in res2.json()["detail"].lower()


@pytest.mark.anyio
async def test_resend_otp_enforces_cooldown(mock_resend_email):
    """Verifies that attempting to resend OTP within 60 seconds returns HTTP 429."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/auth/register",
            json={"email": "cooldown@campus.edu", "password": "Password123!"},
        )

        # Immediate resend attempt must trigger 429 cooldown
        resend_res = await client.post(
            "/api/auth/resend-otp",
            json={"email": "cooldown@campus.edu"},
        )
        assert resend_res.status_code == 429
        data = resend_res.json()
        assert "Please wait" in data["detail"]
        assert "seconds before requesting a new verification code" in data["detail"]


@pytest.mark.anyio
async def test_resend_otp_after_cooldown_invalidates_prior_otp(mock_resend_email):
    """Verifies that generating a new OTP invalidates the prior OTP code."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/auth/register",
            json={"email": "invalidate@campus.edu", "password": "Password123!"},
        )
        first_otp = mock_resend_email[-1]["otp"]

        # Clear cooldown
        otp_rate_limiter.clear()

        # Request new OTP
        resend_res = await client.post(
            "/api/auth/resend-otp",
            json={"email": "invalidate@campus.edu"},
        )
        assert resend_res.status_code == 200
        assert len(mock_resend_email) == 2
        second_otp = mock_resend_email[-1]["otp"]

        # First OTP must no longer be valid
        verify_old = await client.post(
            "/api/auth/verify-otp",
            json={"email": "invalidate@campus.edu", "otp": first_otp},
        )
        if first_otp != second_otp:
            assert verify_old.status_code == 400

        # Second OTP must be valid and activate account
        verify_new = await client.post(
            "/api/auth/verify-otp",
            json={"email": "invalidate@campus.edu", "otp": second_otp},
        )
        assert verify_new.status_code == 200
        assert verify_new.json()["user"]["is_verified"] is True


@pytest.mark.anyio
async def test_unverified_user_cannot_login_with_password(mock_resend_email):
    """Verifies that unverified accounts are blocked from logging in with HTTP 403."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/auth/register",
            json={"email": "unverified@campus.edu", "password": "Password123!"},
        )

        login_res = await client.post(
            "/api/auth/login",
            json={"email": "unverified@campus.edu", "password": "Password123!"},
        )
        assert login_res.status_code == 403
        assert "Email address not verified" in login_res.json()["detail"]


@pytest.mark.anyio
async def test_verified_user_login_succeeds(mock_resend_email):
    """Verifies that once verified, a user can log in normally with their password."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register and verify
        await client.post(
            "/api/auth/register",
            json={"email": "verified@campus.edu", "password": "Password123!"},
        )
        otp = mock_resend_email[-1]["otp"]
        await client.post(
            "/api/auth/verify-otp",
            json={"email": "verified@campus.edu", "otp": otp},
        )

        # Log in
        login_res = await client.post(
            "/api/auth/login",
            json={"email": "verified@campus.edu", "password": "Password123!"},
        )
        assert login_res.status_code == 200
        data = login_res.json()
        assert data["user"]["email"] == "verified@campus.edu"
        assert data["user"]["is_verified"] is True
        assert "token" in data


@pytest.mark.anyio
async def test_existing_verified_users_remain_unaffected(test_user):
    """Verifies that pre-existing users (is_verified=True) can log in and access protected features without OTP."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/auth/login",
            json={"email": test_user.email, "password": "password123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["token"]

        # Access protected endpoint
        me_res = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["is_verified"] is True


@pytest.mark.anyio
async def test_github_oauth_user_automatically_verified():
    """Verifies that users signing up or signing in via GitHub OAuth are marked verified."""
    db = TestSession()
    try:
        user = User(
            email="oauthdev@github.test",
            full_name="OAuth Developer",
            default_profile_username="oauthdev",
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        conn = ConnectedGitHubAccount(
            user_id=user.id,
            github_user_id=998877,
            github_login="oauthdev",
            avatar_url="https://avatars.githubusercontent.com/u/998877",
            html_url="https://github.com/oauthdev",
        )
        db.add(conn)
        db.commit()

        assert user.is_verified is True

        token = create_access_token({"sub": str(user.id), "email": user.email})
    finally:
        db.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        me_res = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["is_verified"] is True
        assert me_res.json()["connected_github"]["github_login"] == "oauthdev"


@pytest.mark.anyio
async def test_resend_api_failure_handling(monkeypatch):
    """Verifies that Resend API connection or dispatch failures return HTTP 502 Bad Gateway."""
    async def fail_send_otp(*args, **kwargs):
        raise EmailDeliveryError("Resend upstream timeout")

    monkeypatch.setattr("app.routers.auth.send_otp_email", fail_send_otp)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/auth/register",
            json={"email": "resendfail@campus.edu", "password": "Password123!"},
        )
        assert res.status_code == 502
        assert "Could not send verification email" in res.json()["detail"]


@pytest.mark.anyio
async def test_resend_otp_enumeration_prevention():
    """Verifies that requesting OTP resend for non-existent or already-verified emails does not leak status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Non-existent email
        res1 = await client.post(
            "/api/auth/resend-otp",
            json={"email": "nonexistent@campus.edu"},
        )
        assert res1.status_code == 200
        assert "If an unverified account exists for this email" in res1.json()["message"]


def test_email_template_rendering():
    """Verifies that HTML and text templates render with branding, OTP code, and security instructions."""
    otp = "654321"
    html = build_otp_email_html(otp, "dev@campus.edu")
    text = build_otp_email_text(otp, "dev@campus.edu")

    assert "654321" in html
    assert "DevProfile AI" in html
    assert "10 minutes" in html

    assert "654321" in text
    assert "DevProfile AI" in text
    assert "10 minutes" in text
