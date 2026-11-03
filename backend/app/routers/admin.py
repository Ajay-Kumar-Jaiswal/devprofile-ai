"""
DevProfile AI — Administrator Storage Diagnostics & Maintenance Router

Endpoints:
- GET  /api/admin/storage-stats: Detailed database storage diagnostics, table metrics, and cleanup counters.
- POST /api/admin/run-cleanup:   Triggers automated, idempotent database maintenance.

Security:
- Requires administrative authorization via `X-Admin-Key` or `Authorization: Bearer <key>`.
- Never exposes database credentials, hostnames, passwords, or connection strings.
"""

import hmac
import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.services.cleanup_service import run_database_cleanup, CleanupLockError
from app.services.storage_monitor_service import get_database_storage_report

logger = logging.getLogger("devprofile_ai.admin")

router = APIRouter(prefix="/api/admin", tags=["Administrator & Storage Management"])


def verify_admin_authorization(
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    authorization: Optional[str] = Header(None),
) -> bool:
    """
    Validates administrative credentials using constant-time string comparison.
    Accepts `X-Admin-Key` header or `Authorization: Bearer <key>`.
    """
    provided_key = x_admin_key
    if not provided_key and authorization:
        parts = authorization.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            provided_key = parts[1]
        elif len(parts) == 1:
            provided_key = parts[0]

    if not provided_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required. Provide X-Admin-Key or Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Valid candidates: explicit ADMIN_API_KEY if configured, or SECRET_KEY
    valid_keys = []
    if settings.ADMIN_API_KEY and settings.ADMIN_API_KEY.strip():
        valid_keys.append(settings.ADMIN_API_KEY.strip())
    if settings.SECRET_KEY and settings.SECRET_KEY.strip():
        valid_keys.append(settings.SECRET_KEY.strip())

    is_authorized = any(hmac.compare_digest(provided_key.strip(), vk) for vk in valid_keys)
    if not is_authorized:
        logger.warning("Unauthorized access attempt to admin storage endpoint.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid administrator credentials.",
        )

    return True


@router.get(
    "/storage-stats",
    summary="Get database storage diagnostics and cleanup eligibility counts",
)
def get_storage_stats(
    authorized: bool = Depends(verify_admin_authorization),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Returns administrative database metrics:
    - Total database storage usage (PostgreSQL / SQLite)
    - Table-wise sizes and largest tables
    - Eligible expired OTP records
    - Eligible abandoned unverified accounts (> 7 days)
    """
    try:
        report = get_database_storage_report(db)
        return report
    except Exception as exc:
        logger.error(f"Error computing database storage report: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute storage diagnostics.",
        )


@router.post(
    "/run-cleanup",
    summary="Trigger transactional database storage cleanup",
)
def trigger_database_cleanup(
    retention_days: int = Query(1, ge=0, le=30, description="Retention in days for consumed temporary records"),
    unverified_threshold_days: int = Query(7, ge=1, le=90, description="Age in days for abandoned unverified accounts"),
    batch_size: int = Query(100, ge=10, le=1000, description="Batch deletion limit"),
    authorized: bool = Depends(verify_admin_authorization),
) -> Dict[str, Any]:
    """
    Executes an administrative maintenance sweep:
    - Purges expired & consumed Email Verification OTPs
    - Purges expired & consumed Password Reset OTPs
    - Purges expired & consumed Account Deletion OTPs
    - Purges expired & consumed OAuth States
    - Purges abandoned unverified accounts older than specified threshold
    """
    try:
        summary = run_database_cleanup(
            retention_days=retention_days,
            unverified_threshold_days=unverified_threshold_days,
            batch_size=batch_size,
        )
        return summary
    except CleanupLockError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error(f"Error executing database cleanup: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete database cleanup.",
        )
