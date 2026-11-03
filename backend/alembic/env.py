import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool, Table, MetaData, Column, String, PrimaryKeyConstraint, text, inspect
import alembic.ddl.impl as ddl_impl
from alembic import context

# Ensure alembic_version table uses VARCHAR(255) for all dialects,
# supporting revision identifiers longer than Alembic's default 32 characters.
def _custom_version_table_impl(
    self,
    *,
    version_table: str,
    version_table_schema: str | None,
    version_table_pk: bool,
    **kw,
) -> Table:
    vt = Table(
        version_table,
        MetaData(),
        Column("version_num", String(255), nullable=False),
        schema=version_table_schema,
    )
    if version_table_pk:
        vt.append_constraint(
            PrimaryKeyConstraint("version_num", name=f"{version_table}_pkc")
        )
    return vt

ddl_impl.DefaultImpl.version_table_impl = _custom_version_table_impl
for _impl_cls in ddl_impl._impls.values():
    _impl_cls.version_table_impl = _custom_version_table_impl

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.database import ensure_version_column_compatibility
from app.db_models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# Set target metadata for 'autogenerate' support
target_metadata = Base.metadata


def get_url() -> str:
    """Resolve database URL from config or app settings with SQLite and PostgreSQL compatibility."""
    import os
    configured_url = config.get_main_option("sqlalchemy.url")
    env_override = os.environ.get("DATABASE_URL")

    if configured_url and configured_url != "driver://user:pass@localhost/dbname":
        raw_url = configured_url
    elif env_override and env_override.strip():
        raw_url = env_override.strip()
    else:
        raw_url = settings.DATABASE_URL

    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql://", 1)

    if raw_url.startswith("sqlite:///") and not raw_url.startswith("sqlite:////"):
        path_part = raw_url[len("sqlite:///"):]
        if path_part.startswith("./") or not Path(path_part).is_absolute():
            clean_rel = path_part.lstrip("./")
            abs_db_path = (backend_dir / clean_rel).resolve().as_posix()
            return f"sqlite:///{abs_db_path}"

    return raw_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    url = get_url()
    configuration = config.get_section(config.config_ini_section, {}) or {}
    configuration["sqlalchemy.url"] = url

    is_sqlite = url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        ensure_version_column_compatibility(connection)

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=is_sqlite,
        )

        with context.begin_transaction():
            context.run_migrations()

        # In SQLAlchemy 2.0, commit any pending version table updates on dialects with non-transactional DDL
        if connection.in_transaction():
            connection.commit()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
