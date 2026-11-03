import hashlib
import hmac
import logging
import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.config import settings
from app.db_models import User, EmailVerificationOTP, AccountDeletionOTP

logger = logging.getLogger("devprofile_ai.otp_service")


class OTPVerificationError(Exception):
    """Raised for OTP verification business rule failures."""
    def __init__(self, message: str, status_code: int = 400, remaining_attempts: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.remaining_attempts = remaining_attempts


class OTPRateLimitTracker:
    """
    In-memory rate limiting and cooldown enforcement for OTP requests.
    Prevents brute-force abuse and Resend API spam.
    """
    def __init__(self):
        # email -> last_sent_timestamp (epoch seconds)
        self._last_sent: dict[str, float] = {}
        # user_id -> last_sent_deletion_timestamp
        self._deletion_last_sent: dict[int, float] = {}
        # ip -> list of request timestamps within rolling window
        self._ip_requests: dict[str, list[float]] = defaultdict(list)
        # ip -> list of verify attempt timestamps
        self._ip_verify_attempts: dict[str, list[float]] = defaultdict(list)

    def check_resend_cooldown(self, email: str, cooldown_seconds: int = 60) -> int:
        """
        Returns 0 if cooldown has elapsed, or seconds remaining if still on cooldown.
        """
        clean_email = email.lower().strip()
        last = self._last_sent.get(clean_email)
        if not last:
            return 0
        elapsed = time.time() - last
        if elapsed < cooldown_seconds:
            return int(cooldown_seconds - elapsed) + 1
        return 0

    def record_send(self, email: str):
        self._last_sent[email.lower().strip()] = time.time()

    def check_deletion_cooldown(self, user_id: int, cooldown_seconds: int = 60) -> int:
        """
        Returns 0 if deletion cooldown has elapsed, or seconds remaining if still on cooldown.
        """
        last = self._deletion_last_sent.get(user_id)
        if not last:
            return 0
        elapsed = time.time() - last
        if elapsed < cooldown_seconds:
            return int(cooldown_seconds - elapsed) + 1
        return 0

    def record_deletion_send(self, user_id: int):
        self._deletion_last_sent[user_id] = time.time()

    def check_ip_generate_rate_limit(self, client_ip: str, max_requests: int = 10, window_seconds: int = 300) -> bool:
        """Limits generating new OTPs to max_requests per window per IP."""
        now = time.time()
        timestamps = [t for t in self._ip_requests[client_ip] if now - t < window_seconds]
        self._ip_requests[client_ip] = timestamps
        return len(timestamps) < max_requests

    def record_ip_generate(self, client_ip: str):
        self._ip_requests[client_ip].append(time.time())

    def check_ip_verify_rate_limit(self, client_ip: str, max_attempts: int = 25, window_seconds: int = 300) -> bool:
        """Limits verification attempts per IP to prevent distributed dictionary attacks."""
        now = time.time()
        timestamps = [t for t in self._ip_verify_attempts[client_ip] if now - t < window_seconds]
        self._ip_verify_attempts[client_ip] = timestamps
        return len(timestamps) < max_attempts

    def record_ip_verify(self, client_ip: str):
        self._ip_verify_attempts[client_ip].append(time.time())

    def clear(self):
        self._last_sent.clear()
        self._deletion_last_sent.clear()
        self._ip_requests.clear()
        self._ip_verify_attempts.clear()


otp_rate_limiter = OTPRateLimitTracker()


def generate_secure_otp(length: int = 6) -> str:
    """
    Generates a cryptographically secure 6-digit numeric OTP.
    Uses Python's secrets module for CSPRNG guarantees.
    """
    return "".join(secrets.choice("0123456789") for _ in range(length))


def hash_otp(otp_code: str, salt: str) -> str:
    """
    Hashes an OTP code with a per-record cryptographic salt using SHA-256.
    Plaintext OTP is never persisted in database storage.
    """
    payload = f"{salt}:{otp_code.strip()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def create_and_store_otp(
    db: Session,
    user: User,
    expiration_minutes: int = 10,
    max_attempts: int = 5,
) -> Tuple[str, EmailVerificationOTP]:
    """
    Generates a new secure 6-digit OTP, invalidates any existing unconsumed OTPs
    for the user, and persists only the hashed OTP record.
    Returns (plaintext_otp, otp_record).
    """
    clean_email = user.email.lower().strip()
    now_utc = datetime.now(timezone.utc)

    # Invalidate all prior unconsumed OTP records for this user/email
    prior_otps = (
        db.query(EmailVerificationOTP)
        .filter(
            EmailVerificationOTP.user_id == user.id,
            EmailVerificationOTP.is_consumed == False,  # noqa: E712
        )
        .all()
    )
    for p in prior_otps:
        p.is_consumed = True
        p.consumed_at = now_utc

    # Generate new secure 6-digit OTP and unique salt
    plaintext_otp = generate_secure_otp(6)
    salt = secrets.token_hex(16)
    otp_hash = hash_otp(plaintext_otp, salt)

    expires_at = now_utc + timedelta(minutes=expiration_minutes)

    new_otp_record = EmailVerificationOTP(
        user_id=user.id,
        email=clean_email,
        otp_hash=otp_hash,
        salt=salt,
        attempts=0,
        max_attempts=max_attempts,
        expires_at=expires_at,
        is_consumed=False,
        created_at=now_utc,
    )
    db.add(new_otp_record)
    db.commit()
    db.refresh(new_otp_record)

    # Record sending time for cooldown
    otp_rate_limiter.record_send(clean_email)

    return plaintext_otp, new_otp_record


def verify_otp_and_activate_user(
    db: Session,
    email: str,
    otp_code: str,
) -> User:
    """
    Validates a submitted 6-digit OTP against the latest active record.
    Enforces expiration, attempt limits, single-use, and timing-attack resistance.
    Activates the user account (is_verified = True) upon successful verification.
    """
    clean_email = email.lower().strip()
    clean_otp = otp_code.strip()

    if len(clean_otp) != 6 or not clean_otp.isdigit():
        raise OTPVerificationError(
            message="Verification code must be exactly 6 digits.",
            status_code=400,
        )

    # Fetch user
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise OTPVerificationError(
            message="Invalid verification request or email not found.",
            status_code=404,
        )

    if user.is_verified:
        raise OTPVerificationError(
            message="This account is already verified. Please sign in with your email and password.",
            status_code=400,
        )

    now_utc = datetime.now(timezone.utc)

    # Retrieve most recent unconsumed OTP record
    otp_record = (
        db.query(EmailVerificationOTP)
        .filter(
            EmailVerificationOTP.user_id == user.id,
            EmailVerificationOTP.is_consumed == False,  # noqa: E712
        )
        .order_by(desc(EmailVerificationOTP.created_at))
        .first()
    )

    if not otp_record:
        raise OTPVerificationError(
            message="No active verification code found for this account. Please request a new code.",
            status_code=400,
        )

    # Check attempt threshold before checking code
    if otp_record.attempts >= otp_record.max_attempts:
        otp_record.is_consumed = True
        otp_record.consumed_at = now_utc
        db.commit()
        raise OTPVerificationError(
            message="Maximum verification attempts exceeded. For your security, this code has been invalidated. Please request a new code.",
            status_code=400,
            remaining_attempts=0,
        )

    # Check expiration
    record_expires = otp_record.expires_at
    if record_expires.tzinfo is None:
        record_expires = record_expires.replace(tzinfo=timezone.utc)

    if now_utc > record_expires:
        otp_record.is_consumed = True
        otp_record.consumed_at = now_utc
        db.commit()
        raise OTPVerificationError(
            message="Verification code has expired. Please request a new code.",
            status_code=400,
        )

    # Validate OTP hash with constant-time equality
    expected_hash = hash_otp(clean_otp, otp_record.salt)
    is_valid = hmac.compare_digest(otp_record.otp_hash, expected_hash)

    if not is_valid:
        otp_record.attempts += 1
        remaining = otp_record.max_attempts - otp_record.attempts

        if remaining <= 0:
            otp_record.is_consumed = True
            otp_record.consumed_at = now_utc
            db.commit()
            raise OTPVerificationError(
                message="Incorrect verification code. Maximum attempts exceeded. Please request a new code.",
                status_code=400,
                remaining_attempts=0,
            )

        db.commit()
        raise OTPVerificationError(
            message=f"Incorrect verification code. You have {remaining} {'attempt' if remaining == 1 else 'attempts'} remaining.",
            status_code=400,
            remaining_attempts=remaining,
        )

    # Successful verification: mark single-use OTP consumed and activate user
    otp_record.is_consumed = True
    otp_record.consumed_at = now_utc
    user.is_verified = True
    user.is_active = True
    user.updated_at = now_utc

    db.commit()
    db.refresh(user)

    logger.info(f"User #{user.id} ({clean_email}) successfully verified email via OTP.")
    return user


def create_and_store_deletion_otp(
    db: Session,
    user: User,
    client_ip: str = "unknown",
) -> tuple[str, AccountDeletionOTP]:
    """
    Generates a secure 6-digit OTP for account deletion, hashes it with a per-record salt,
    invalidates any prior unconsumed deletion OTPs for the user, and persists it.
    """
    if not user.email or not user.email.strip():
        raise OTPVerificationError(
            message="No verified email address is associated with this account. Please configure an email address before deleting your account.",
            status_code=400,
        )

    # 1. Cooldown check
    remaining_cooldown = otp_rate_limiter.check_deletion_cooldown(
        user.id, settings.OTP_RESEND_COOLDOWN_SECONDS
    )
    if remaining_cooldown > 0:
        raise OTPVerificationError(
            message=f"Please wait {remaining_cooldown} seconds before requesting a new deletion code.",
            status_code=429,
        )

    # 2. IP rate limit check
    if not otp_rate_limiter.check_ip_generate_rate_limit(client_ip):
        raise OTPVerificationError(
            message="Too many deletion code requests from this network. Please wait a few minutes before trying again.",
            status_code=429,
        )

    now_utc = datetime.now(timezone.utc)

    # 3. Invalidate prior active deletion OTPs for this user
    prior_otps = (
        db.query(AccountDeletionOTP)
        .filter(
            AccountDeletionOTP.user_id == user.id,
            AccountDeletionOTP.is_consumed == False,  # noqa: E712
        )
        .all()
    )
    for p in prior_otps:
        p.is_consumed = True
        p.consumed_at = now_utc

    # 4. Generate cryptographically secure OTP & hash
    raw_otp = generate_secure_otp(6)
    salt = secrets.token_hex(16)
    hashed = hash_otp(raw_otp, salt)
    expires_at = now_utc + timedelta(minutes=settings.OTP_EXPIRATION_MINUTES)

    new_otp = AccountDeletionOTP(
        user_id=user.id,
        email=user.email.lower().strip(),
        otp_hash=hashed,
        salt=salt,
        attempts=0,
        max_attempts=settings.OTP_MAX_ATTEMPTS,
        expires_at=expires_at,
        is_consumed=False,
        created_at=now_utc,
    )
    db.add(new_otp)
    db.commit()
    db.refresh(new_otp)

    # 5. Record rate limits
    otp_rate_limiter.record_deletion_send(user.id)
    otp_rate_limiter.record_ip_generate(client_ip)

    logger.info(f"Generated deletion OTP for user #{user.id}. Valid for {settings.OTP_EXPIRATION_MINUTES} mins.")
    return raw_otp, new_otp


def verify_deletion_otp(
    db: Session,
    user: User,
    entered_otp: str,
    client_ip: str = "unknown",
) -> AccountDeletionOTP:
    """
    Validates the account deletion OTP for the authenticated user using constant-time comparison.
    Enforces expiration, single-use, and maximum failed attempt thresholds.
    """
    if not entered_otp or not str(entered_otp).strip():
        raise OTPVerificationError(
            message="Please provide the 6-digit deletion verification code.",
            status_code=400,
        )

    clean_otp = str(entered_otp).strip().replace(" ", "")
    if len(clean_otp) != 6 or not clean_otp.isdigit():
        raise OTPVerificationError(
            message="Verification code must be exactly 6 numeric digits.",
            status_code=400,
        )

    # IP rate limit check
    if not otp_rate_limiter.check_ip_verify_rate_limit(client_ip):
        raise OTPVerificationError(
            message="Too many deletion attempts from this network. Please wait a few minutes before trying again.",
            status_code=429,
        )
    otp_rate_limiter.record_ip_verify(client_ip)

    now_utc = datetime.now(timezone.utc)

    # Retrieve most recent unconsumed deletion OTP for this user
    otp_record = (
        db.query(AccountDeletionOTP)
        .filter(
            AccountDeletionOTP.user_id == user.id,
            AccountDeletionOTP.is_consumed == False,  # noqa: E712
        )
        .order_by(desc(AccountDeletionOTP.created_at))
        .first()
    )

    if not otp_record:
        raise OTPVerificationError(
            message="No active deletion verification code found for this account. Please request a new deletion code.",
            status_code=400,
        )

    # Check attempt threshold before checking code
    if otp_record.attempts >= otp_record.max_attempts:
        otp_record.is_consumed = True
        otp_record.consumed_at = now_utc
        db.commit()
        raise OTPVerificationError(
            message="Maximum verification attempts exceeded. For your security, this code has been invalidated. Please request a new deletion code.",
            status_code=400,
            remaining_attempts=0,
        )

    # Check expiration
    record_expires = otp_record.expires_at
    if record_expires.tzinfo is None:
        record_expires = record_expires.replace(tzinfo=timezone.utc)

    if now_utc > record_expires:
        otp_record.is_consumed = True
        otp_record.consumed_at = now_utc
        db.commit()
        raise OTPVerificationError(
            message="Deletion verification code has expired. Please request a new code.",
            status_code=400,
        )

    # Validate OTP hash with constant-time equality
    expected_hash = hash_otp(clean_otp, otp_record.salt)
    is_valid = hmac.compare_digest(otp_record.otp_hash, expected_hash)

    if not is_valid:
        otp_record.attempts += 1
        remaining = otp_record.max_attempts - otp_record.attempts

        if remaining <= 0:
            otp_record.is_consumed = True
            otp_record.consumed_at = now_utc
            db.commit()
            raise OTPVerificationError(
                message="Incorrect verification code. Maximum attempts exceeded. Please request a new code.",
                status_code=400,
                remaining_attempts=0,
            )

        db.commit()
        raise OTPVerificationError(
            message=f"Incorrect verification code. You have {remaining} {'attempt' if remaining == 1 else 'attempts'} remaining.",
            status_code=400,
            remaining_attempts=remaining,
        )

    # Successful verification: mark single-use OTP consumed
    otp_record.is_consumed = True
    otp_record.consumed_at = now_utc
    db.commit()

    logger.info(f"User #{user.id} ({user.email}) successfully verified account deletion OTP.")
    return otp_record
