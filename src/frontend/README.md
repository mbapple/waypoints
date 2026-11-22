# WayPoints frontend

React 19 app built with [Vite](https://vite.dev). It normally runs in the `frontend` container of the root `docker-compose.yml`, which runs `npm ci && npm start` (the Vite dev server on port 3000).

## Scripts
- `npm start` / `npm run dev`: dev server with hot reload on port 3000. It proxies `/api` and `/uploads` to `BACKEND_URL` (default `http://waypoints_backend:3001`).
- `npm run build`: production bundle in `build/`.
- `npm run preview`: serve the built bundle with the same proxy.

## Configuration
Read by `vite.config.js` from the environment, in Node only:
- `BACKEND_URL`: backend address for the proxy.
- `FRONTEND_ALLOWED_HOSTS`: extra hostnames allowed in the Host header (comma-separated, or `all`).
- `CHOKIDAR_USEPOLLING=true`: use polling file watching (needed on some bind mounts).

Never put secrets in `VITE_*` variables; Vite compiles them into the public bundle.

## Conventions
Files containing JSX use the `.jsx` extension; plain modules (`api/`, `utils/`, `styles/theme.js`…) stay `.js`. See the root `CLAUDE.md` for the component and styling conventions.
