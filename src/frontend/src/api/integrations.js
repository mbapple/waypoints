import { api } from './client';

// Third-party integrations proxied through the backend so API keys stay server-side.

// -> { ors_configured: boolean }
export const getIntegrationStatus = () => api.get('/integrations/status').then(r => r.data);

// start/end: { lat, lon } -> { duration_seconds, distance_miles, coordinates: [[lon, lat], ...] }
export const fetchDrivingRoute = (start, end) =>
  api.post('/integrations/ors/route', {
    start: { lat: Number(start.lat), lon: Number(start.lon) },
    end: { lat: Number(end.lat), lon: Number(end.lon) },
  }).then(r => r.data);
