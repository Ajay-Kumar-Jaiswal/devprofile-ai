#!/usr/bin/env python3
"""
DevProfile AI — Database Migration Runner

Applies all pending Alembic migrations up to head (including is_verified,
terms_accepted, and OTP verification tables) for both SQLite and PostgreSQL.
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from alembic.config import Config
from alembic import command
from app.database import db_url, init_db


def run_migration():
    print("Starting DevProfile AI Alembic database migration...")

    alembic_ini = backend_dir / "alembic.ini"
    if not alembic_ini.exists():
        print(f"Error: alembic.ini not found at {alembic_ini}")
        sys.exit(1)

    cfg = Config(str(alembic_ini))
    cfg.set_main_option("sqlalchemy.url", db_url)

    # Upgrade to head
    command.upgrade(cfg, "head")
    print("Alembic migrations applied to head successfully.")

    # Run init_db check to ensure complete consistency
    init_db()
    print("Database initialization verification complete.")


if __name__ == "__main__":
    run_migration()
