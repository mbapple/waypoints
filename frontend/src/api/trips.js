import { api } from "./client";

export const getTrip = (id) => api.get(`/trips/${id}`).then(r => r.data);
export const listTrips = () => api.get('/trips').then(r => r.data);
export const createTrip = (payload) => api.post('/trips', payload).then(r => r.data);
export const updateTrip = (id, payload) => api.put(`/trips/${id}`, payload).then(r => r.data);
export const deleteTrip = (id) => api.delete(`/trips/${id}`).then(r => r.data);
export const getTripMiles = (id) => api.get(`/trips/${id}/miles`).then(r => r.data);
