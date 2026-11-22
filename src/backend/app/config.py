"""Central backend configuration, read from environment variables.

Values come from .env via docker compose (see .env.example at the repo root).
Import as `import config` (uvicorn runs from this directory, so it is on sys.path).
"""
import os


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Environment variable {name} must be set (see .env.example)")
    return value


# Database
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "travel_database")
DB_USER = _required("DB_USER")
DB_PASS = _required("DB_PASS")

# CORS: comma-separated list of allowed origins
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

# Storage locations (inside the backend container; bind-mounted by compose)
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/workspaces/src/uploads")
BACKUP_DIR = os.getenv("BACKUP_DIR", "/workspaces/src/backups")

# Integrations (secrets stay server-side; never expose them to the frontend)
ORS_API_KEY = os.getenv("ORS_API_KEY", "").strip()

# OpenSky Network API client (free account) for recorded flight tracks.
# Create one at https://opensky-network.org > Account > API Client.
OPENSKY_CLIENT_ID = os.getenv("OPENSKY_CLIENT_ID", "").strip()
OPENSKY_CLIENT_SECRET = os.getenv("OPENSKY_CLIENT_SECRET", "").strip()

# Immich (self-hosted photo library). All Immich calls are made by the backend;
# the browser only sees WayPoints' own proxy URLs. Accept the base URL with or
# without a trailing "/api".
def _immich_base_url(name: str) -> str:
    url = os.getenv(name, "").strip().rstrip("/")
    return url[: -len("/api")] if url.endswith("/api") else url


IMMICH_URL = _immich_base_url("IMMICH_URL")
IMMICH_API_KEY = os.getenv("IMMICH_API_KEY", "").strip()
# Browser-facing Immich address, used only to redirect "Open in Immich" clicks
# (GET /api/integrations/immich/assets/<id>/open). Defaults to IMMICH_URL.
IMMICH_PUBLIC_URL = _immich_base_url("IMMICH_PUBLIC_URL") or IMMICH_URL

# Nominatim (OpenStreetMap geocoder) for the backend's city lookups. The public
# server allows about 1 request per second; point this at your own instance to
# go faster. NOMINATIM_LANGUAGE sets the language of returned city names.
NOMINATIM_URL = os.getenv("NOMINATIM_URL", "https://nominatim.openstreetmap.org").strip().rstrip("/")
NOMINATIM_LANGUAGE = os.getenv("NOMINATIM_LANGUAGE", "en").strip()
