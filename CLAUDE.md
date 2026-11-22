# CLAUDE.md

WayPoints is a self-hosted travel tracker: a React frontend, a FastAPI backend, and a PostGIS database, run with Docker Compose. See `README.md` for the domain model (Trips → Nodes, Legs, Stops; plus Adventures, Lists, Photos).

## Layout

```
.env.example               # template for .env (all settings and secrets): committed
docker-compose.yml.example # template for docker-compose.yml: committed
src/
  backend/                 # FastAPI (Python 3.12)
    Dockerfile
    alembic.ini, alembic/versions/   # schema migrations (raw SQL)
    app/
      main.py              # app setup, CORS, router registration, /uploads static mount
      config.py            # ALL env-var config (DB, CORS, paths, API keys)
      start.sh             # container entrypoint: wait for DB → alembic upgrade head → uvicorn :3001
      requirements.txt
      routers/             # one module per resource; connect.py provides get_db()
  frontend/                # Vite + React 19 (react-router 7, styled-components, react-leaflet)
    index.html             # Vite entry HTML → src/index.jsx
    vite.config.js         # dev-server port, /api + /uploads proxy, allowed hosts
    public/                # static assets served at / (favicon, manifest, logos)
    src/
      App.jsx              # all routes
      api/                 # one module per backend resource
      pages/               # route-level pages (Create/, Update/, Lists/ subfolders)
      components/          # reusable components (common/, forms/, trip-details/, photos/, map/, lists/)
      context/SettingsContext.js   # per-browser UI prefs (theme, font scale) in localStorage
      styles/              # theme.js tokens, components.js styled primitives, mapTheme.js
      utils/               # geo, formatting, map data helpers
  database/init.sql        # legacy schema reference only, NOT executed (Alembic owns the schema)
```

Gitignored, user-owned: `.env`, `docker-compose.yml`, `db_data/` (Postgres data), `uploads/` (photos), `backups/` (DB dumps).

## Running

```bash
cp docker-compose.yml.example docker-compose.yml
cp .env.example .env      # set POSTGRES_PASSWORD, optionally ORS_API_KEY
docker compose up --build
```

- Only the frontend is published (port 3000). The Vite dev server (`src/frontend/vite.config.js`) proxies `/api` and `/uploads` to `BACKEND_URL` (`http://waypoints_backend:3001`). The backend and DB are not exposed to the host by default.
- Vite rejects unknown Host headers. localhost and IPs always work; other hostnames need `FRONTEND_ALLOWED_HOSTS` in `.env`.
- Source dirs are bind-mounted. Frontend edits hot-reload. After backend edits, run `docker compose restart backend`, which also applies new migrations.
- The frontend container (`node:24`) runs `npm ci && npm start` (the Vite dev server) on every start. Serving a production build instead is a pending TODO.
- Backend API docs: `http://localhost:3001/docs` (needs the backend port uncommented in compose) or via `docker compose exec`.

## Backend conventions

- **Routers**: one file per resource in `app/routers/`, prefix `/api/<resource>`, registered in `main.py`.
- **DB access**: raw SQL through `get_db()` from `routers/connect.py` (psycopg2 with `RealDictCursor`, so rows are dicts). Each handler opens a connection, executes, commits, and closes. There is no ORM.
- **SQL safety**: always pass values as `%s` parameters. PUT handlers build the `SET` clause dynamically, but only from an explicit `allowed` set of column names (see `routers/legs.py::update_leg`). Keep that pattern and never interpolate request values into SQL.
- **Models**: Pydantic create and update models per router. Update models have all fields optional and use `model_dump(exclude_unset=True)`.
- **Imports**: uvicorn runs from `app/`. `main.py` uses `from routers import x`. Routers use `from .connect import get_db` and `import config`.
- **Config**: read settings only via `app/config.py`. Never hardcode credentials, hosts or paths. To add a setting, add it to `config.py`, `.env.example` and the backend `environment:` in `docker-compose.yml.example`.
- **Migrations**: add `alembic/versions/YYYYMMDD_NNNN_description.py` with `revision`/`down_revision` chained to the previous file. Use `op.execute("...")` raw SQL (`target_metadata = None`, no autogenerate). Migrations run automatically on backend start. Geography columns (`geog`) are maintained by triggers (see migration 0002).
- **External APIs needing keys** go through a backend proxy so the key stays server-side. See `routers/integrations.py` (OpenRouteService), `routers/immich.py` and `routers/opensky.py` (flight tracks; OAuth2 client-credentials token cached in-process). All use stdlib `urllib`, so no extra dependency.
- **Immich**: all communication with Immich stays in the backend (`routers/immich.py`). The frontend must never call Immich or receive its URL or key. Linked photos are rows in `photos` with `immich_asset_id` set and `url` = `/api/integrations/immich/assets/<id>/preview` (the backend image proxy), so photo display code needs no special case.

## Frontend conventions

- **File extensions**: any file containing JSX must be `.jsx` (Vite won't parse JSX in `.js`). Plain modules (`api/`, `utils/`, `styles/theme.js`, `styles/components.js`) stay `.js`. Imports are extensionless.
- **API calls**: add or extend `src/api/<resource>.js` using the shared axios instance from `api/client.js` (`baseURL: "/api"`). It has a response interceptor that rounds any `miles` / `*_miles` fields to 0.1. Don't call `fetch` against the backend directly.
- **Pages are composed from reusable components**. Check `components/common/` (Popup, ContextMenu, ConfirmDeleteButton, NodeSelect, LegSelect), `components/forms/` (shared create/update forms), `components/trip-details/`, `components/photos/` and the `*-components.js` modules before writing new UI. Create and Update pages share the same form component.
- **Styling**: styled-components. Use the primitives in `styles/components.js` (Card, Button, Input, Text, Flex…) and theme tokens (`props.theme.colors/space/fontSizes/breakpoints`) from `styles/theme.js`. Support both dark and light themes and mobile widths.
- **Routes** live in `App.jsx`. The page container is keyed by pathname, so page state resets on navigation.
- **Never put secrets in the frontend.** `VITE_*` vars and anything imported into `src/` are compiled into the public bundle. `vite.config.js` reads non-prefixed env vars in Node only. `SettingsContext` holds UI prefs only.
- External calls made from the browser: Nominatim place search (`components/map-integration-components.js`) and OpenStreetMap tiles (`styles/mapTheme.js`). Neither needs a key. Both themes use the same OSM tiles; dark mode adds the `.map-tiles-dark` CSS filter to the tile layer only. Every `<TileLayer>` must spread `getTileLayerConfig(isDark)`, set `key={isDark ? 'dark' : 'light'}` and render `MapGlobalStyles`. Don't switch back to CARTO: it has required an API key since 2026.
- **Dependencies**: keep `package.json` minimal; every dependency must be imported somewhere in `src/` (or be Vite tooling). Run `npm audit` after changes.

## Security posture

- **There is no authentication anywhere.** That includes `/api/admin`, whose DB restore runs `psql -f` on an uploaded `.sql` file, which means arbitrary SQL. The app must be deployed on a trusted network or behind a VPN or authenticating reverse proxy. Don't claim otherwise in docs.
- Secrets live only in `.env`. Compose maps variables per service, so the frontend container gets no DB creds or API keys. Keep it that way.
- The Immich proxy lets anyone who can reach WayPoints view any image the `IMMICH_API_KEY` can read. Asset ids are UUID-checked before being put in Immich URLs.
- Photo uploads are restricted by extension and size and saved under random UUID names (`routers/photos.py`). Backup filenames are path-checked (`routers/admin.py::_safe_backup_path`).

## Testing / verification

There is no test suite (frontend or backend) and no linter. Verify changes by:
- `python -m py_compile` on changed backend files.
- `docker compose up --build`, then exercising the UI and endpoints (`curl localhost:3000/api/...` goes through the frontend proxy).
- Frontend compile check: `docker run --rm -v $PWD/src/frontend:/app -w /app node:24 bash -lc "npm ci && npm run build"` (or `npm ci && npm run build` locally with Node ≥20.19).

## Docs

- `README.md`: user-facing features, install and to-do list.
- `src/backend/README.md`: endpoint reference. Update it when adding or changing endpoints.
