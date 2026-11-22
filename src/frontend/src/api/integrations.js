import { api } from './client';

// Third-party integrations proxied through the backend so API keys stay server-side.

// -> { ors_configured, immich_configured, opensky_configured }
export const getIntegrationStatus = () => api.get('/integrations/status').then(r => r.data);

// start/end: { lat, lon } -> { duration_seconds, distance_miles, coordinates: [[lon, lat], ...] }
export const fetchDrivingRoute = (start, end) =>
  api.post('/integrations/ors/route', {
    start: { lat: Number(start.lat), lon: Number(start.lon) },
    end: { lat: Number(end.lat), lon: Number(end.lon) },
  }).then(r => r.data);

// Recorded flight path from the OpenSky Network (backend needs OPENSKY_CLIENT_ID/SECRET).
// { flight_number, date: 'YYYY-MM-DD', start_airport?, end_airport? }
// -> { source, callsign, icao24, departure_airport, arrival_airport, first_seen, last_seen,
//      route: { origin, destination } | null, coordinates: [[lon, lat], ...] }
export const fetchFlightTrack = ({ flight_number, date, start_airport, end_airport }) =>
  api.post('/integrations/opensky/flight-track', {
    flight_number,
    date,
    start_airport: start_airport || null,
    end_airport: end_airport || null,
  }).then(r => r.data);
