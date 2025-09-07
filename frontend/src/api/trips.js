import { api } from "./client";

export const getTrip = (id) => api.get(`/trips/${id}`).then(r => r.data);
export const listTrips = () => api.get('/trips').then(r => r.data);
export const createTrip = (payload) => api.post('/trips', payload).then(r => r.data);
export const updateTrip = (id, payload) => api.put(`/trips/${id}`, payload).then(r => r.data);
export const deleteTrip = (id) => api.delete(`/trips/${id}`).then(r => r.data);
export const getTripMiles = (id) => api.get(`/trips/${id}/miles`).then(r => r.data);
export const getTripStatistics = () => api.get('/trips/data/statistics').then(r => r.data);
export const getTripsByMiles = () => api.get('/trips/data/trips_by_miles').then(r => r.data);
export const getTripsByNights = () => api.get('/trips/data/trips_by_nights').then(r => r.data);
export const getLegsByType = (type) => api.get('/trips/data/legs_by_type', { params: { type } }).then(r => r.data);
export const getNodesByCountry = (country) => api.get('/trips/data/nodes_by_country', { params: { country } }).then(r => r.data);
export const getNodesByState = (state, country) => api.get('/trips/data/nodes_by_state', { params: { state, country } }).then(r => r.data);
export const getTripsByOsm = (osm_id) => api.get('/trips/data/trips_by_osm', { params: { osm_id } }).then(r => r.data);
