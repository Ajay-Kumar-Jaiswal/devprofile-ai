import logging
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator
from app.config import settings, _backend_dir

logger = logging.getLogger("devprofile_ai")

# Resolve relative SQLite paths and postgres:// prefixes
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

if db_url.startswith("sqlite:///") and not db_url.startswith("sqlite:////"):
    # Strip protocol prefix to inspect path
    path_part = db_url[len("sqlite:///"):]
    if path_part.startswith("./") or not Path(path_part).is_absolute():
        clean_rel = path_part.lstrip("./")
        abs_db_path = (_backend_dir / clean_rel).resolve().as_posix()
        db_url = f"sqlite:///{abs_db_path}"

# Configure SQLite vs PostgreSQL connection options
is_sqlite = db_url.startswith("sqlite")
engine_kwargs = {}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(db_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def apply_migrations() -> None:
    """Applies all pending Alembic migrations up to head programmatically."""
    import sys
    # Skip during automated pytest test runs where in-memory DB is managed by fixtures
    if "pytest" in sys.modules or "sqlite:///:memory:" in db_url:
        return

    from alembic.config import Config
    from alembic import command

    alembic_ini_path = _backend_dir / "alembic.ini"
    if not alembic_ini_path.exists():
        logger.warning(f"Alembic configuration not found at {alembic_ini_path}")
        return

    try:
        alembic_cfg = Config(str(alembic_ini_path))
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)
        alembic_cfg.attributes["configure_logger"] = False
        command.upgrade(alembic_cfg, "head")
        logger.info("Alembic schema migrations applied successfully to head.")
    except Exception as e:
        logger.error(f"Fatal Alembic migration failure: {e}", exc_info=True)
        raise RuntimeError(f"Database migration failed: {e}") from e


def init_db() -> None:
    """
    Initializes database schema using Alembic as the single controlled migration authority.
    Ensures table baseline and stops deployment if schema migrations fail.
    """
    import app.db_models  # noqa: F401

    # 1. Apply Alembic migrations first (fails fast on error)
    apply_migrations()

    # 2. Ensure metadata tables exist as safe baseline
    Base.metadata.create_all(bind=engine)
