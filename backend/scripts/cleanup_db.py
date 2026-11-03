#!/usr/bin/env python3
"""
DevProfile AI — Independent Database Cleanup Script

Executes automated maintenance routines:
- Purges expired & consumed Email Verification OTPs
- Purges expired & consumed Password Reset OTPs
- Purges expired & consumed Account Deletion OTPs
- Purges expired & consumed OAuth States
- Purges abandoned unverified accounts older than 7 days

Supports CLI flags:
  --retention-days <int>     (default: 1)
  --unverified-days <int>    (default: 7)
  --batch-size <int>         (default: 100)
  --report-only              (only print storage report without deleting)
"""

import argparse
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal
from app.services.cleanup_service import run_database_cleanup, CleanupLockError
from app.services.storage_monitor_service import get_database_storage_report


def main():
    parser = argparse.ArgumentParser(description="DevProfile AI Database Cleanup Utility")
    parser.add_argument("--retention-days", type=int, default=1, help="Retention period in days for consumed records")
    parser.add_argument("--unverified-days", type=int, default=7, help="Threshold in days for abandoned unverified accounts")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size for deletions")
    parser.add_argument("--report-only", action="store_true", help="Print storage diagnostics without performing deletions")
    args = parser.parse_args()

    print("==================================================")
    print("DevProfile AI — Database Maintenance Utility")
    print("==================================================")

    db = SessionLocal()
    try:
        report = get_database_storage_report(db)
        print(f"Database Engine: {report['engine']}")
        print(f"Total Database Size: {report['total_database_size_formatted']}")
        print(f"Temporary records eligible for cleanup: {report['cleanup_eligibility']['total_expired_temporary_records']}")
        print(f"Abandoned unverified accounts (> {args.unverified_days}d): {report['cleanup_eligibility']['abandoned_unverified_accounts']}")

        if args.report_only:
            print("\nReport-only mode active. Skipping deletion.")
            return

        print("\nExecuting transactional database cleanup...")
        summary = run_database_cleanup(
            retention_days=args.retention_days,
            unverified_threshold_days=args.unverified_days,
            batch_size=args.batch_size,
        )
        print("Cleanup completed successfully:")
        print(f" - Email Verification OTPs deleted: {summary['deleted_email_verification_otps']}")
        print(f" - Password Reset OTPs deleted:     {summary['deleted_password_reset_otps']}")
        print(f" - Account Deletion OTPs deleted:   {summary['deleted_account_deletion_otps']}")
        print(f" - Expired OAuth States deleted:    {summary['deleted_expired_oauth_states']}")
        print(f" - Abandoned Unverified Accounts:   {summary['deleted_abandoned_unverified_accounts']}")
        print(f"Total records purged: {summary['total_records_cleaned']}")

    except CleanupLockError as exc:
        print(f"Notice: Concurrency lock active ({exc}). Another cleanup worker is running.")
        sys.exit(0)
    except Exception as exc:
        print(f"Error during database cleanup: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
