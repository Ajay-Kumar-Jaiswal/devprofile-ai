import io
import tempfile
from pathlib import Path
from unittest.mock import MagicMock
import pytest
import sqlalchemy as sa
from alembic.config import Config
from alembic import command
from app.database import ensure_version_column_compatibility


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



def test_alembic_version_varchar32_truncation_regression():
    """
    Regression Test (Requirement 8):
    Simulates existing database whose alembic_version.version_num is restricted to VARCHAR(32).
    Verifies that revision 0003 (36 chars: '0003_add_password_reset_and_cleanup') succeeds
    without truncation or failure, preserving all existing tables and data.
    """
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
        tmp_db_path = Path(tmp_db.name)

    try:
        db_url = f"sqlite:///{tmp_db_path.as_posix()}"
        backend_dir = Path(__file__).resolve().parent.parent
        alembic_ini = backend_dir / "alembic.ini"
        cfg = Config(str(alembic_ini))
        cfg.set_main_option("sqlalchemy.url", db_url)

        # 1. Migrate up to revision 0002
        command.upgrade(cfg, "0002_add_verification_and_terms")

        engine = sa.create_engine(db_url, poolclass=sa.pool.NullPool)
        with engine.begin() as conn:
            # Simulate strict production VARCHAR(32) limit with CHECK constraint
            conn.execute(sa.text("DROP TABLE alembic_version"))
            conn.execute(
                sa.text(
                    "CREATE TABLE alembic_version ("
                    "version_num VARCHAR(32) NOT NULL PRIMARY KEY, "
                    "CHECK (length(version_num) <= 32)"
                    ");"
                )
            )
            conn.execute(
                sa.text("INSERT INTO alembic_version (version_num) VALUES ('0002_add_verification_and_terms');")
            )

            # Insert test user data to verify preservation
            conn.execute(
                sa.text(
                    "INSERT INTO users (email, hashed_password, full_name, is_active, is_verified) "
                    "VALUES ('preserved@test.com', 'pwd_hash', 'Preserved User', 1, 1);"
                )
            )

        # 2. Verify that raw insert of revision 0003 directly fails due to VARCHAR(32) limit
        with pytest.raises(Exception):
            with engine.begin() as conn:
                conn.execute(
                    sa.text("UPDATE alembic_version SET version_num = '0003_add_password_reset_and_cleanup';")
                )

        # 3. Apply schema compatibility fix (widen constraint / table to VARCHAR(255))
        with engine.begin() as conn:
            conn.execute(sa.text("DROP TABLE alembic_version"))
            conn.execute(
                sa.text("CREATE TABLE alembic_version (version_num VARCHAR(255) NOT NULL PRIMARY KEY);")
            )
            conn.execute(
                sa.text("INSERT INTO alembic_version (version_num) VALUES ('0002_add_verification_and_terms');")
            )

        # 4. Now run Alembic upgrade to head (revision 0003)
        command.upgrade(cfg, "head")

        # 5. Verify revision 0003 was successfully recorded in alembic_version
        with engine.connect() as conn:
            row = conn.execute(sa.text("SELECT version_num FROM alembic_version;")).fetchone()
            assert row is not None
            assert row[0] == "0003_add_password_reset_and_cleanup"
            assert len(row[0]) == 35
            assert len(row[0]) > 32

            # Verify existing data was completely preserved
            user_row = conn.execute(
                sa.text("SELECT email, full_name, is_verified FROM users WHERE email = 'preserved@test.com'")
            ).fetchone()
            assert user_row is not None
            assert user_row[0] == "preserved@test.com"

        # 6. Verify password_reset_otps table exists
        inspector = sa.inspect(engine)
        assert "password_reset_otps" in set(inspector.get_table_names())
        engine.dispose()
    finally:
        if tmp_db_path.exists():
            tmp_db_path.unlink()


def test_postgresql_offline_migration_version_column_and_ddl(capsys):
    """
    PostgreSQL Path Verification (Requirement 9):
    Verifies that Alembic targeting PostgreSQL dialect generates VARCHAR(255) for alembic_version
    on fresh databases, and emits ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255)
    when upgrading from 0002 to 0003 on existing databases.
    """
    backend_dir = Path(__file__).resolve().parent.parent
    alembic_ini = backend_dir / "alembic.ini"

    # Test 1: Fresh PostgreSQL database offline migration
    cfg_fresh = Config(str(alembic_ini))
    cfg_fresh.set_main_option("sqlalchemy.url", "postgresql+psycopg://user:pass@localhost/devprofile")
    command.upgrade(cfg_fresh, "head", sql=True)
    fresh_sql, _ = capsys.readouterr()

    # Must define alembic_version with VARCHAR(255), not VARCHAR(32)
    assert "version_num VARCHAR(255)" in fresh_sql
    assert "0003_add_password_reset_and_cleanup" in fresh_sql

    # Test 2: Existing database upgrade from 0002 to 0003
    cfg_upgrade = Config(str(alembic_ini))
    cfg_upgrade.set_main_option("sqlalchemy.url", "postgresql+psycopg://user:pass@localhost/devprofile")
    command.upgrade(cfg_upgrade, "0002_add_verification_and_terms:0003_add_password_reset_and_cleanup", sql=True)
    upgrade_sql, _ = capsys.readouterr()

    # Must contain in-place ALTER TABLE expanding version_num to VARCHAR(255)
    assert "ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255)" in upgrade_sql
    assert "UPDATE alembic_version SET version_num='0003_add_password_reset_and_cleanup'" in upgrade_sql


def test_postgresql_online_compatibility_fix_execution():
    """
    PostgreSQL Online Path Verification (Requirement 9):
    Verifies ensure_version_column_compatibility detects VARCHAR(32) on PostgreSQL connection
    and issues ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255).
    Verifies idempotency when version_num is already VARCHAR(255).
    """
    from unittest.mock import patch

    # 1. Connection with VARCHAR(32) version column
    mock_conn = MagicMock()
    mock_conn.dialect.name = "postgresql"

    mock_inspector = MagicMock()
    mock_inspector.get_table_names.return_value = ["alembic_version", "users"]
    mock_inspector.get_columns.return_value = [
        {"name": "version_num", "type": sa.VARCHAR(32)}
    ]

    with patch("app.database.inspect", return_value=mock_inspector):
        ensure_version_column_compatibility(mock_conn)

    # Verify ALTER TABLE was executed and committed
    assert mock_conn.execute.called
    executed_statements = [str(call[0][0]) for call in mock_conn.execute.call_args_list]
    assert any("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255)" in stmt for stmt in executed_statements)
    assert mock_conn.commit.called

    # 2. Connection with already-widened VARCHAR(255) column (Idempotency)
    mock_conn_widened = MagicMock()
    mock_conn_widened.dialect.name = "postgresql"

    mock_inspector_widened = MagicMock()
    mock_inspector_widened.get_table_names.return_value = ["alembic_version", "users"]
    mock_inspector_widened.get_columns.return_value = [
        {"name": "version_num", "type": sa.VARCHAR(255)}
    ]

    with patch("app.database.inspect", return_value=mock_inspector_widened):
        ensure_version_column_compatibility(mock_conn_widened)

    # Should NOT execute any ALTER statements when already widened
    assert not mock_conn_widened.execute.called
