from datetime import timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.db_models import User
from app.services.auth_service import decode_access_token


def get_token_from_request(request: Request) -> Optional[str]:
    """Extracts JWT token from Authorization Bearer header or HttpOnly cookie."""
    # 1. Check Authorization Bearer header first (explicit header overrides ambient cookie)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[len("Bearer ") :].strip()

    # 2. Check HttpOnly cookie
    token = request.cookies.get("devprofile_session")
    if token:
        return token

    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """
    Enforces authentication for protected endpoints.
    Raises HTTP 401 if unauthenticated or token is expired/invalid.
    """
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access this resource.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token payload.",
        )

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user or not user.is_active or not getattr(user, "is_verified", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found, deactivated, or email not verified.",
        )

    # Invalidate session tokens issued prior to a password reset or security credential change
    token_iat = payload.get("iat")
    if token_iat and user.updated_at:
        user_updated_epoch = int(
            user.updated_at.replace(tzinfo=timezone.utc).timestamp()
            if user.updated_at.tzinfo is None
            else user.updated_at.timestamp()
        )
        # Allow 5s tolerance for clock skew
        if token_iat < (user_updated_epoch - 5):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked due to a password or security update. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Enforce personal instance allowlist if configured
    if settings.allowed_github_accounts_list:
        user_gh = user.connected_github.github_login if user.connected_github else user.default_profile_username
        if not settings.is_github_account_allowed(user_gh):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this personal instance is restricted to authorized GitHub accounts.",
            )

    return user


def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Optional authentication dependency for endpoints accessible to both
    authenticated users and guests/demos.
    """
    token = get_token_from_request(request)
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    user_id = payload.get("sub")
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        return None

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user or not user.is_active or not getattr(user, "is_verified", True):
        return None

    # Enforce personal instance allowlist if configured
    if settings.allowed_github_accounts_list:
        user_gh = user.connected_github.github_login if user.connected_github else user.default_profile_username
        if not settings.is_github_account_allowed(user_gh):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this personal instance is restricted to authorized GitHub accounts.",
            )

    return user
