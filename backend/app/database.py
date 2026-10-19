from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator
from app.config import settings, _backend_dir

# Resolve relative SQLite paths to the canonical backend directory
db_url = settings.DATABASE_URL
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


def init_db() -> None:
    """Creates all database tables defined in the metadata and applies schema adjustments."""
    import app.db_models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    # Ensure consumed_at column exists on oauth_states table
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE oauth_states ADD COLUMN consumed_at DATETIME"))
            conn.commit()
    except Exception:
        # Column already exists
        pass
