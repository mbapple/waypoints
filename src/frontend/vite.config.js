import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Settings come from the frontend container's environment (see docker-compose.yml.example).
// NOTE: these are read here in Node only. Never use the VITE_ prefix for secrets:
// VITE_* variables are compiled into the public browser bundle.
const BACKEND_URL = process.env.BACKEND_URL || 'http://waypoints_backend:3001';

// Hostnames allowed in the Host header (Vite blocks unknown hosts to prevent DNS rebinding).
// localhost and IP addresses always work. Add your reverse-proxy hostname(s), comma-separated,
// or "all" to disable the check.
function allowedHosts() {
  const raw = (process.env.FRONTEND_ALLOWED_HOSTS || '').trim();
  if (raw === 'all') return true;
  return raw.split(',').map((h) => h.trim()).filter(Boolean);
}

// The browser only talks to this server; API and photo requests are forwarded to the backend.
const proxy = {
  '/api': { target: BACKEND_URL, changeOrigin: true },
  '/uploads': { target: BACKEND_URL, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: allowedHosts(),
    proxy,
    // Bind mounts from some hosts (Docker Desktop, WSL) don't deliver file events
    watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === 'true' },
  },
  preview: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: allowedHosts(),
    proxy,
  },
  build: {
    outDir: 'build',
  },
});
