"""
DevProfile AI — Database Storage Monitoring Service

Provides administrative storage metrics and table-level diagnostics:
- Total database size (PostgreSQL / SQLite)
- Table-wise storage consumption and largest tables
- Count of expired and consumed OTP records eligible for cleanup
- Count of abandoned unverified accounts eligible for cleanup

Strictly protects database credentials and sensitive connection data.
"""

import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.database import engine
from app.db_models import (
    AccountDeletionOTP,
    AnalysisRun,
    ConnectedGitHubAccount,
    EmailVerificationOTP,
    OAuthState,
    PasswordResetOTP,
    TrackedRecommendation,
    User,
    UserSavedInternship,
)

logger = logging.getLogger("devprofile_ai.storage_monitor")


def format_bytes(size_bytes: int) -> str:
    """Format bytes into human-readable representation."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def get_database_storage_report(db: Session) -> Dict[str, Any]:
    """
    Computes storage diagnostics across all tables and cleanup eligibility counters.
    Safe for both PostgreSQL and SQLite. Never exposes connection strings or credentials.
    """
    dialect = engine.dialect.name
    now_utc = datetime.now(timezone.utc)
    one_day_ago = now_utc - timedelta(days=1)
    seven_days_ago = now_utc - timedelta(days=7)

    # 1. Cleanup eligibility counters
    expired_email_otps = (
        db.query(EmailVerificationOTP)
        .filter(
            or_(
                EmailVerificationOTP.expires_at < now_utc,
                EmailVerificationOTP.is_consumed == True,  # noqa: E712
            )
        )
        .count()
    )

    expired_pwd_otps = (
        db.query(PasswordResetOTP)
        .filter(
            or_(
                PasswordResetOTP.expires_at < now_utc,
                PasswordResetOTP.is_consumed == True,  # noqa: E712
            )
        )
        .count()
    )

    expired_del_otps = (
        db.query(AccountDeletionOTP)
        .filter(
            or_(
                AccountDeletionOTP.expires_at < now_utc,
                AccountDeletionOTP.is_consumed == True,  # noqa: E712
            )
        )
        .count()
    )

    expired_oauth_states = (
        db.query(OAuthState)
        .filter(
            or_(
                OAuthState.expires_at < now_utc,
                OAuthState.consumed_at.is_not(None),
            )
        )
        .count()
    )

    # Abandoned unverified accounts counter
    has_gh = select(ConnectedGitHubAccount.user_id).distinct()
    has_runs = select(AnalysisRun.user_id).filter(AnalysisRun.user_id.is_not(None)).distinct()
    has_saved = select(UserSavedInternship.user_id).distinct()
    has_recs = select(TrackedRecommendation.user_id).distinct()

    abandoned_accounts_count = (
        db.query(User)
        .filter(
            User.is_verified == False,  # noqa: E712
            User.created_at < seven_days_ago,
            User.id.not_in(has_gh),
            User.id.not_in(has_runs),
            User.id.not_in(has_saved),
            User.id.not_in(has_recs),
        )
        .count()
    )

    # 2. Table-wise statistics and total database size
    table_stats: List[Dict[str, Any]] = []
    total_db_bytes = 0

    if dialect == "postgresql":
        try:
            # Query total DB size
            db_size_res = db.execute(text("SELECT pg_database_size(current_database())")).scalar()
            total_db_bytes = int(db_size_res or 0)

            # Query table-level storage sizes in public schema
            tables_query = text(
                """
                SELECT
                    relname AS table_name,
                    pg_total_relation_size(c.oid) AS total_bytes,
                    pg_relation_size(c.oid) AS table_bytes,
                    pg_total_relation_size(c.oid) - pg_relation_size(c.oid) AS index_bytes,
                    n_live_tup AS estimated_rows
                FROM pg_class c
                LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
                LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
                WHERE n.nspname = 'public' AND c.relkind = 'r'
                ORDER BY total_bytes DESC;
                """
            )
            rows = db.execute(tables_query).fetchall()
            for r in rows:
                t_bytes = int(r.total_bytes or 0)
                table_stats.append({
                    "table_name": r.table_name,
                    "total_bytes": t_bytes,
                    "total_size_formatted": format_bytes(t_bytes),
                    "table_bytes": int(r.table_bytes or 0),
                    "index_bytes": int(r.index_bytes or 0),
                    "estimated_rows": int(r.estimated_rows or 0),
                })
        except Exception as exc:
            logger.warning(f"Error querying PostgreSQL storage stats: {exc}")
    else:
        # SQLite fallback: inspect file size and table row counts
        try:
            from app.database import db_url
            if "sqlite:///" in db_url:
                db_path_str = db_url.replace("sqlite:///", "")
                db_file = Path(db_path_str)
                if db_file.exists():
                    total_db_bytes = db_file.stat().st_size

            # Gather row counts for key tables
            table_names = [
                "users",
                "connected_github_accounts",
                "analyzed_profiles",
                "analysis_runs",
                "tracked_recommendations",
                "recommendation_events",
                "oauth_states",
                "email_verification_otps",
                "account_deletion_otps",
                "password_reset_otps",
                "internship_listings",
                "user_saved_internships",
            ]
            for t_name in table_names:
                try:
                    cnt = db.execute(text(f"SELECT COUNT(*) FROM {t_name}")).scalar()
                    table_stats.append({
                        "table_name": t_name,
                        "total_bytes": 0,
                        "total_size_formatted": "SQLite row count",
                        "estimated_rows": int(cnt or 0),
                    })
                except Exception:
                    pass
        except Exception as exc:
            logger.warning(f"Error inspecting SQLite storage stats: {exc}")

    # Identify largest tables (top 5)
    largest_tables = sorted(table_stats, key=lambda x: x.get("total_bytes", 0), reverse=True)[:5]

    return {
        "status": "healthy",
        "engine": dialect,
        "timestamp": now_utc.isoformat(),
        "total_database_bytes": total_db_bytes,
        "total_database_size_formatted": format_bytes(total_db_bytes),
        "table_count": len(table_stats),
        "tables": table_stats,
        "largest_tables": largest_tables,
        "cleanup_eligibility": {
            "expired_email_verification_otps": expired_email_otps,
            "expired_password_reset_otps": expired_pwd_otps,
            "expired_account_deletion_otps": expired_del_otps,
            "expired_oauth_states": expired_oauth_states,
            "total_expired_temporary_records": (
                expired_email_otps
                + expired_pwd_otps
                + expired_del_otps
                + expired_oauth_states
            ),
            "abandoned_unverified_accounts": abandoned_accounts_count,
        },
    }
