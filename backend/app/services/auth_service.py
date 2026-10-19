import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from fastapi import HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.db_models import OAuthState

logger = logging.getLogger("devprofile_ai.auth")

# Argon2 password hasher
_hasher = PasswordHasher()

# In-memory brute-force rate limiter: key -> list of timestamp attempts
_failed_login_attempts: Dict[str, list[float]] = {}
RATE_LIMIT_WINDOW_SECONDS = 300  # 5 minutes
MAX_FAILED_ATTEMPTS = 5


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return _hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2 hash."""
    try:
        return _hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp()), "iat": int(now.timestamp())})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a signed JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None


def check_login_rate_limit(key: str) -> None:
    """
    Checks if a client IP or email has exceeded the allowed failed login threshold.
    Raises HTTP 429 if rate limited.
    """
    now = time.time()
    attempts = _failed_login_attempts.get(key, [])
    # Filter attempts within the window
    recent_attempts = [t for t in attempts if now - t < RATE_LIMIT_WINDOW_SECONDS]
    _failed_login_attempts[key] = recent_attempts

    if len(recent_attempts) >= MAX_FAILED_ATTEMPTS:
        retry_after = int(RATE_LIMIT_WINDOW_SECONDS - (now - recent_attempts[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {max(1, retry_after)} seconds.",
            headers={"Retry-After": str(max(1, retry_after))},
        )


def record_failed_login(key: str) -> None:
    """Records a failed login attempt timestamp."""
    now = time.time()
    attempts = _failed_login_attempts.get(key, [])
    attempts.append(now)
    _failed_login_attempts[key] = attempts


def reset_failed_login(key: str) -> None:
    """Clears failed login attempts after a successful login."""
    _failed_login_attempts.pop(key, None)


def set_auth_cookie(response: Response, token: str) -> None:
    """Sets the HttpOnly session cookie on the outgoing response."""
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    response.set_cookie(
        key="devprofile_session",
        value=token,
        max_age=max_age,
        expires=max_age,
        path="/",
        domain=None,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
    )


def clear_auth_cookie(response: Response) -> None:
    """Clears the HttpOnly session cookie."""
    response.delete_cookie(
        key="devprofile_session",
        path="/",
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
    )


def generate_oauth_state(db: Session, user_id: Optional[int] = None) -> str:
    """Generates and persists a cryptographically secure OAuth state parameter."""
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=10)

    oauth_state = OAuthState(
        state_token=token,
        user_id=user_id,
        created_at=now,
        expires_at=expires,
        consumed_at=None,
    )
    db.add(oauth_state)
    db.commit()

    state_prefix = token[:8] + "..." if len(token) >= 8 else "short..."
    logger.info(f"OAuth state generated and committed [prefix: {state_prefix}] (valid for 10 minutes)")
    return token


def verify_and_consume_oauth_state(db: Session, state_token: str) -> Optional[OAuthState]:
    """
    Validates and consumes an OAuth state token to prevent replay attacks.
    Differentiates between mismatched, expired, and already-consumed states
    with safe masked diagnostic logs.
    """
    if not state_token or not isinstance(state_token, str):
        logger.warning("OAuth state verification failed: empty or non-string state token provided.")
        return None

    state_prefix = state_token[:8] + "..." if len(state_token) >= 8 else "short..."
    logger.info(f"Validating OAuth state [prefix: {state_prefix}]")

    state_obj = db.query(OAuthState).filter(OAuthState.state_token == state_token).first()
    if not state_obj:
        active_count = db.query(OAuthState).filter(OAuthState.consumed_at.is_(None)).count()
        logger.warning(
            f"OAuth state verification failed [MISMATCHED]: state token prefix {state_prefix} not found in database. "
            f"(Active unconsumed states: {active_count})"
        )
        return None

    # Check if already consumed (replay attempt or duplicate request)
    if state_obj.consumed_at is not None:
        logger.warning(
            f"OAuth state verification failed [ALREADY_CONSUMED]: state token prefix {state_prefix} "
            f"was already consumed at {state_obj.consumed_at}."
        )
        return None

    # Check expiration
    now = datetime.now(timezone.utc)
    expires = (
        state_obj.expires_at.replace(tzinfo=timezone.utc)
        if state_obj.expires_at.tzinfo is None
        else state_obj.expires_at
    )

    if now > expires:
        logger.warning(
            f"OAuth state verification failed [EXPIRED]: state token prefix {state_prefix} "
            f"expired at {expires} (current time: {now})."
        )
        # Mark as consumed so expired records don't linger
        state_obj.consumed_at = now
        db.commit()
        return None

    # State is valid - consume it now to prevent any replay
    state_obj.consumed_at = now
    db.commit()
    logger.info(f"OAuth state verification succeeded [VALID]: state token prefix {state_prefix} consumed.")
    return state_obj


def check_oauth_state_status(db: Session, state_token: str) -> str:
    """
    Inspects OAuth state status ('valid', 'mismatched', 'expired', or 'already_consumed')
    without consuming the state.
    """
    if not state_token:
        return "mismatched"

    state_obj = db.query(OAuthState).filter(OAuthState.state_token == state_token).first()
    if not state_obj:
        return "mismatched"

    if state_obj.consumed_at is not None:
        return "already_consumed"

    now = datetime.now(timezone.utc)
    expires = (
        state_obj.expires_at.replace(tzinfo=timezone.utc)
        if state_obj.expires_at.tzinfo is None
        else state_obj.expires_at
    )

    if now > expires:
        return "expired"

    return "valid"

