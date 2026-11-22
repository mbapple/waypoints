from __future__ import annotations
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine import URL
from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config


def _database_url() -> str:
    """DATABASE_URL if set, otherwise built from DB_* env vars (see .env.example)."""
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASS")
    if not user or not password:
        raise RuntimeError("Set DATABASE_URL or DB_USER/DB_PASS (see .env.example)")
    # URL.create escapes special characters in the password
    return URL.create(
        "postgresql+psycopg2",
        username=user,
        password=password,
        host=os.getenv("DB_HOST", "db"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "travel_database"),
    ).render_as_string(hide_password=False)


# configparser treats '%' as interpolation, so escape it
config.set_main_option("sqlalchemy.url", _database_url().replace("%", "%%"))

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None  # We're using raw SQL migrations

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
