import tempfile
from pathlib import Path
import sqlalchemy as sa
from alembic.config import Config
from alembic import command


def test_alembic_migration_upgrade_and_downgrade():
    """Verify upgrade and downgrade lifecycle of Alembic migrations on a fresh database."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
        tmp_db_path = Path(tmp_db.name)

    try:
        db_url = f"sqlite:///{tmp_db_path.as_posix()}"
        backend_dir = Path(__file__).resolve().parent.parent
        alembic_ini = backend_dir / "alembic.ini"

        cfg = Config(str(alembic_ini))
        cfg.set_main_option("sqlalchemy.url", db_url)

        # 1. Upgrade to 0001 (baseline)
        command.upgrade(cfg, "0001_baseline_schema")
        engine = sa.create_engine(db_url)
        inspector = sa.inspect(engine)
        tables_0001 = set(inspector.get_table_names())
        assert "users" in tables_0001
        assert "analysis_runs" in tables_0001
        assert "email_verification_otps" not in tables_0001

        user_cols_0001 = {c["name"] for c in inspector.get_columns("users")}
        assert "is_verified" not in user_cols_0001
        assert "terms_accepted" not in user_cols_0001

        # 2. Upgrade to 0002 (verification & terms)
        command.upgrade(cfg, "0002_add_verification_and_terms")
        inspector = sa.inspect(engine)
        tables_0002 = set(inspector.get_table_names())
        assert "email_verification_otps" in tables_0002
        assert "account_deletion_otps" in tables_0002
        assert "password_reset_otps" not in tables_0002

        user_cols_0002 = {c["name"] for c in inspector.get_columns("users")}
        assert "is_verified" in user_cols_0002
        assert "terms_accepted" in user_cols_0002
        assert "terms_accepted_version" in user_cols_0002
        assert "terms_accepted_at" in user_cols_0002

        oauth_cols = {c["name"] for c in inspector.get_columns("oauth_states")}
        assert "consumed_at" in oauth_cols

        # 3. Upgrade to 0003 (password reset & cleanup)
        command.upgrade(cfg, "0003_add_password_reset_and_cleanup")
        inspector = sa.inspect(engine)
        tables_0003 = set(inspector.get_table_names())
        assert "password_reset_otps" in tables_0003
        pwd_otp_cols = {c["name"] for c in inspector.get_columns("password_reset_otps")}
        assert "reset_token" in pwd_otp_cols
        assert "reset_token_expires_at" in pwd_otp_cols

        # 4. Downgrade back to 0002
        command.downgrade(cfg, "0002_add_verification_and_terms")
        inspector = sa.inspect(engine)
        assert "password_reset_otps" not in set(inspector.get_table_names())

        # 5. Downgrade back to 0001
        command.downgrade(cfg, "0001_baseline_schema")
        inspector = sa.inspect(engine)
        tables_downgraded = set(inspector.get_table_names())
        assert "email_verification_otps" not in tables_downgraded
        assert "account_deletion_otps" not in tables_downgraded
        assert "password_reset_otps" not in tables_downgraded

        user_cols_downgraded = {c["name"] for c in inspector.get_columns("users")}
        assert "is_verified" not in user_cols_downgraded
        assert "terms_accepted" not in user_cols_downgraded

        # 6. Re-upgrade back to head
        command.upgrade(cfg, "head")
        inspector = sa.inspect(engine)
        user_cols_head = {c["name"] for c in inspector.get_columns("users")}
        assert "is_verified" in user_cols_head
        assert "terms_accepted" in user_cols_head
        assert "password_reset_otps" in set(inspector.get_table_names())
        engine.dispose()
    finally:
        if tmp_db_path.exists():
            tmp_db_path.unlink()


def test_alembic_on_preexisting_production_database():
    """Simulates production Neon database where tables existed prior to Alembic."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
        tmp_db_path = Path(tmp_db.name)

    try:
        db_url = f"sqlite:///{tmp_db_path.as_posix()}"
        engine = sa.create_engine(db_url)

        # Pre-populate an old users table with existing user data
        with engine.begin() as conn:
            conn.execute(
                sa.text(
                    """CREATE TABLE users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email VARCHAR(255) UNIQUE,
                        hashed_password VARCHAR(255),
                        full_name VARCHAR(255),
                        default_profile_username VARCHAR(100),
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );"""
                )
            )
            conn.execute(
                sa.text(
                    """INSERT INTO users (email, hashed_password, full_name, is_active)
                       VALUES ('existing@production.com', 'hashedpwd123', 'Prod User', 1);"""
                )
            )

        # Now run Alembic upgrade head
        backend_dir = Path(__file__).resolve().parent.parent
        alembic_ini = backend_dir / "alembic.ini"
        cfg = Config(str(alembic_ini))
        cfg.set_main_option("sqlalchemy.url", db_url)

        command.upgrade(cfg, "head")

        # Verify columns were added and existing user was preserved
        inspector = sa.inspect(engine)
        assert "password_reset_otps" in set(inspector.get_table_names())
        user_cols = {c["name"] for c in inspector.get_columns("users")}
        assert "is_verified" in user_cols
        assert "terms_accepted" in user_cols
        assert "terms_accepted_version" in user_cols
        assert "terms_accepted_at" in user_cols

        with engine.connect() as conn:
            row = conn.execute(
                sa.text("SELECT email, full_name, is_verified FROM users WHERE email = 'existing@production.com'")
            ).fetchone()
            assert row is not None
            assert row[0] == "existing@production.com"
            assert row[1] == "Prod User"
            # Existing users default to verified (1 or True)
            assert bool(row[2]) is True

        engine.dispose()
    finally:
        if tmp_db_path.exists():
            tmp_db_path.unlink()
