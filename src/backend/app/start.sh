#!/usr/bin/env bash
set -euo pipefail

# Ensure we can execute even if mounted as non-executable
chmod +x "$0" || true

# Connection settings come from the environment (see .env.example).
# alembic/env.py and app/config.py build the connection from these.
: "${DB_USER:?DB_USER must be set (see .env.example)}"
: "${DB_PASS:?DB_PASS must be set (see .env.example)}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-travel_database}"

# Wait for DB to be ready
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; do
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
