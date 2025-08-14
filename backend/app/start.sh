#!/usr/bin/env bash
set -euo pipefail

# Ensure we can execute even if mounted as non-executable
chmod +x "$0" || true

# Build DATABASE_URL from env if not provided
if [[ -z "${DATABASE_URL:-}" ]]; then
  DB_HOST="${DB_HOST:-db}"
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${DB_NAME:-travel_database}"
  DB_USER="${DB_USER:-user}"
  DB_PASS="${DB_PASS:-password}"
  export DATABASE_URL="postgresql+psycopg2://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

# Wait for DB to be ready
until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-user}" -d "${DB_NAME:-travel_database}" >/dev/null 2>&1; do
  echo "Waiting for database..."
  sleep 1
done

# Run migrations
cd /workspaces/src/backend || cd /app || true
if [[ -f alembic.ini ]]; then
  echo "Running alembic migrations..."
  alembic upgrade head || { echo "Alembic migration failed"; exit 1; }
fi

# Start FastAPI
cd /workspaces/src/backend/app || cd /app/app || true
exec uvicorn main:app --host 0.0.0.0 --port 3001
