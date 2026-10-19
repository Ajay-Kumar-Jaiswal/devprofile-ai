from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

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
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or has been deactivated.",
        )

    return user


def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
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
    if not user or not user.is_active:
        return None

    return user
