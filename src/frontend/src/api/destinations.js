import { api } from "./client";

// Unique destinations (visible nodes grouped by OSM place) and flight-leg airports
export const listDestinations = () => api.get('/destinations').then(r => r.data);
export const listAirports = () => api.get('/destinations/airports').then(r => r.data);
// payload: { sources: { osm_ids: [], node_ids: [] }, target: { name, osm_id, osm_name, osm_country, osm_state, latitude, longitude } }
export const mergeDestinations = (payload) => api.post('/destinations/merge', payload).then(r => r.data);
