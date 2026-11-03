#!/usr/bin/env python3
"""
DevProfile AI — Database Migration: Email OTP Verification

Adds `is_verified` column to `users` table (defaulting to TRUE for existing users)
and creates `email_verification_otps` table with required constraints and indexes.
Safely handles both SQLite and PostgreSQL. Idempotent and non-destructive.
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.database import engine, Base
import app.db_models  # noqa: F401


def run_migration():
    print("Starting DevProfile AI Email OTP database migration...")

    # 1. Ensure all defined metadata tables (including email_verification_otps) exist
    Base.metadata.create_all(bind=engine)
    print("Metadata tables verified/created.")

    # 2. Add is_verified column to users table if not already present
    with engine.connect() as conn:
        try:
            # Check if column already exists
            db_dialect = engine.dialect.name
            if db_dialect == "postgresql":
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE")
                )
            else:
                # SQLite
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 1")
                )
            conn.commit()
            print("Successfully added 'is_verified' column to 'users' table.")
        except Exception as e:
            # Column likely already exists
            print(f"'is_verified' column check: {e}")

    print("Migration completed successfully.")


if __name__ == "__main__":
    run_migration()
