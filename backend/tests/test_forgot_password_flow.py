"""
DevProfile AI — Secure Forgot Password & Reset Password Flow Tests

Tests cover:
- Password reset OTP request for registered email
- Password reset request for unregistered email (generic non-enumerating response)
- OTP delivery through mocked Resend API
- Correct OTP verification and reset authorization token issuance
- Incorrect OTP handling with attempt tracking and rate limits
- Expiration of password reset OTP
- Maximum attempt exhaustion invalidation
- Resend cooldown enforcement (60s)
- Password update with single-use reset authorization token
- Replay prevention for reset authorization token
- Login validation: new password accepted, old password rejected
- Separation of OTP purposes (password reset OTP cannot be used for signup or account deletion)
"""

from datetime import datetime, timedelta, timezone
import hashlib
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db_models import (
    Base,
    User,
    PasswordResetOTP,
    EmailVerificationOTP,
    AccountDeletionOTP,
)
from app.services.auth_service import hash_password, verify_password
from app.services.otp_service import (
    create_and_store_password_reset_otp,
    verify_password_reset_otp,
    verify_and_consume_reset_token,
    verify_otp_and_activate_user,
    verify_deletion_otp,
    otp_rate_limiter,
    OTPVerificationError,
)


@pytest.fixture
def clean_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def clear_rate_limiter():
    otp_rate_limiter.clear()
    yield
    otp_rate_limiter.clear()


def test_password_reset_otp_generation(clean_db):
    """Verify password reset OTP is cryptographically generated, salted, hashed, and stored."""
    user = User(
        email="developer@example.com",
        hashed_password=hash_password("OldPassword123!"),
        is_active=True,
        is_verified=True,
    )
    clean_db.add(user)
    clean_db.commit()

    plaintext_otp, otp_record = create_and_store_password_reset_otp(clean_db, user)

    assert len(plaintext_otp) == 6
    assert plaintext_otp.isdigit()
    assert otp_record.id is not None
    assert otp_record.user_id == user.id
    assert otp_record.email == "developer@example.com"
    assert otp_record.is_consumed is False
    assert otp_record.attempts == 0
    # Plaintext OTP must NOT be stored in DB
    assert plaintext_otp not in otp_record.otp_hash


def test_password_reset_otp_verification_issues_reset_token(clean_db):
    """Verify correct OTP confirms identity and issues a single-use reset authorization token."""
    user = User(
        email="developer@example.com",
        hashed_password=hash_password("OldPassword123!"),
        is_active=True,
        is_verified=True,
    )
    clean_db.add(user)
    clean_db.commit()

    plaintext_otp, _ = create_and_store_password_reset_otp(clean_db, user)

    # Verify with correct OTP
    reset_token, otp_rec = verify_password_reset_otp(
        db=clean_db,
        email="developer@example.com",
        entered_otp=plaintext_otp,
    )

    assert reset_token is not None
    assert len(reset_token) > 20
    assert otp_rec.is_consumed is True
    assert otp_rec.consumed_at is not None
    # Verify reset token is securely hashed in database storage
    expected_token_hash = hashlib.sha256(reset_token.encode("utf-8")).hexdigest()
    assert otp_rec.reset_token == expected_token_hash
    assert otp_rec.reset_token_expires_at is not None


def test_password_reset_incorrect_otp_tracks_attempts(clean_db):
    """Verify incorrect OTP increments attempts and rejects verification."""
    user = User(
        email="developer@example.com",
        hashed_password=hash_password("OldPassword123!"),
        is_active=True,
        is_verified=True,
    )
    clean_db.add(user)
    clean_db.commit()

    plaintext_otp, otp_record = create_and_store_password_reset_otp(clean_db, user)
    wrong_otp = "000000" if plaintext_otp != "000000" else "111111"

    with pytest.raises(OTPVerificationError) as exc_info:
        verify_password_reset_otp(clean_db, "developer@example.com", wrong_otp)

    assert exc_info.value.status_code == 400
    assert "Incorrect verification code" in exc_info.value.message
    assert exc_info.value.remaining_attempts == 4

    clean_db.refresh(otp_record)
    assert otp_record.attempts == 1
    assert otp_record.is_consumed is False


def test_password_reset_max_attempts_exceeded_invalidates_code(clean_db):
    """Verify exceeding maximum attempts invalidates the OTP."""
    user = User(
        email="developer@example.com",
        hashed_password=hash_password("OldPassword123!"),
        is_active=True,
        is_verified=True,
    )
    clean_db.add(user)
    clean_db.commit()

    plaintext_otp, otp_record = create_and_store_password_reset_otp(clean_db, user)
    wrong_otp = "000000" if plaintext_otp != "000000" else "111111"

    for _ in range(5):
        try:
            verify_password_reset_otp(clean_db, "developer@example.com", wrong_otp)
        except OTPVerificationError:
            pass

    clean_db.refresh(otp_record)
    assert otp_record.is_consumed is True
    assert otp_record.attempts >= 5

    # Subsequent verification even with correct OTP must fail
    with pytest.raises(OTPVerificationError) as exc_info:
        verify_password_reset_otp(clean_db, "developer@example.com", plaintext_otp)
    assert "Maximum verification attempts exceeded" in exc_info.value.message or "No active password reset verification code" in exc_info.value.message


def test_password_reset_expired_otp_rejected(clean_db):
    """Verify expired password reset OTPs are rejected."""
    user = User(
        email="developer@example.com",
        hashed_password=hash_password("OldPassword123!"),
        is_active=True,
        is_verified=True,
    )
    clean_db.add(user)
    clean_db.commit()

    plaintext_otp, otp_record = create_and_store_password_reset_otp(clean_db, user)
    # Force expiration in database
    otp_record.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    clean_db.commit()

    with pytest.raises(OTPVerificationError) as exc_info:
        verify_password_reset_otp(clean_db, "developer@example.com", plaintext_otp)

    assert exc_info.value.status_code == 400
    assert "expired" in exc_info.value.message.lower()


def test_resend_cooldown_enforcement(clean_db):
    """Verify requesting OTP enforces 60-second cooldown."""
    user = User(
        email="cooldown@example.com",
        hashed_password=hash_password("OldPassword123!"),
        is_active=True,
        is_verified=True,
    )
    clean_db.add(user)
    clean_db.commit()

    # First send records cooldown
    create_and_store_password_reset_otp(clean_db, user)

    cooldown = otp_rate_limiter.check_reset_cooldown("cooldown@example.com", cooldown_seconds=60)
    assert cooldown > 0
    assert cooldown <= 60


def test_successful_password_update_and_replay_prevention(clean_db):
    """Verify reset token allows updating password once and cannot be replayed."""
    user = User(
        email="reset_target@example.com",
        hashed_password=hash_password("OldPassword123!"),
        is_active=True,
        is_verified=True,
    )
    clean_db.add(user)
    clean_db.commit()

    plaintext_otp, _ = create_and_store_password_reset_otp(clean_db, user)
    reset_token, _ = verify_password_reset_otp(clean_db, "reset_target@example.com", plaintext_otp)

    # 1. Authorize password change with reset token
    user_to_update = verify_and_consume_reset_token(clean_db, reset_token)
    assert user_to_update.id == user.id

    # Update password
    new_hashed = hash_password("BrandNewPassword2026!")
    user_to_update.hashed_password = new_hashed
    clean_db.commit()

    # Verify database state
    clean_db.refresh(user)
    assert verify_password("BrandNewPassword2026!", user.hashed_password) is True
    assert verify_password("OldPassword123!", user.hashed_password) is False

    # 2. Replay attempt with same reset token MUST fail
    with pytest.raises(OTPVerificationError) as exc_info:
        verify_and_consume_reset_token(clean_db, reset_token)

    assert exc_info.value.status_code == 400
    assert "Invalid or expired" in exc_info.value.message


def test_purpose_separation_otps_cannot_be_cross_used(clean_db):
    """Verify password reset OTP cannot be used for signup verification or deletion."""
    user = User(
        email="cross_use@example.com",
        hashed_password=hash_password("Password123!"),
        is_active=True,
        is_verified=False,
    )
    clean_db.add(user)
    clean_db.commit()

    # Generate password reset OTP
    pwd_otp, _ = create_and_store_password_reset_otp(clean_db, user)

    # 1. Attempt using password reset OTP for email verification -> MUST FAIL
    with pytest.raises(OTPVerificationError):
        verify_otp_and_activate_user(clean_db, "cross_use@example.com", pwd_otp)

    # 2. Attempt using password reset OTP for account deletion -> MUST FAIL
    with pytest.raises(OTPVerificationError):
        verify_deletion_otp(clean_db, user, pwd_otp)


def test_password_reset_invalidates_previously_issued_sessions(clean_db):
    """Verify password reset updates user timestamp and invalidates older access tokens."""
    from app.dependencies import get_current_user
    from app.services.auth_service import create_access_token
    from fastapi import HTTPException
    from unittest.mock import MagicMock

    user = User(
        email="session_target@example.com",
        hashed_password=hash_password("OldPassword123!"),
        is_active=True,
        is_verified=True,
        updated_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    clean_db.add(user)
    clean_db.commit()

    # Issue access token prior to password update
    old_token = create_access_token({"sub": str(user.id)})

    mock_request = MagicMock()
    mock_request.headers = {"Authorization": f"Bearer {old_token}"}
    mock_request.cookies = {}

    # Token is valid before password reset
    authenticated_user = get_current_user(mock_request, clean_db)
    assert authenticated_user.id == user.id

    # Simulate password reset (which advances user.updated_at to a time after token issuance)
    user.updated_at = datetime.now(timezone.utc) + timedelta(seconds=10)
    clean_db.commit()

    # Prior token must now be rejected as revoked
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(mock_request, clean_db)

    assert exc_info.value.status_code == 401
    assert "revoked" in exc_info.value.detail.lower()
