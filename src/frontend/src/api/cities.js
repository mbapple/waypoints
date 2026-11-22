import { api } from "./client";

// Visited cities (visible nodes + stops grouped by their Nominatim city)
export const listCities = () => api.get('/cities').then(r => r.data);
// { missing: { nodes, stops } }: rows with coordinates but no city yet
export const getCityStatus = () => api.get('/cities/status').then(r => r.data);
// cursor: { table, after_id } (omit to start). Returns { results, next, missing }
export const backfillCities = (cursor = {}, limit = 5) =>
  api.post('/cities/backfill', { ...cursor, limit }).then(r => r.data);
