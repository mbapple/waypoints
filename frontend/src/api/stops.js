import { api } from "./client";

export const listStopsByTrip = (tripID) => api.get(`/stops/by_trip/${tripID}`).then(r => r.data);
export const getStop = (id) => api.get(`/stops/${id}`).then(r => r.data);
export const createStop = (payload) => api.post('/stops', payload).then(r => r.data);
export const updateStop = (id, payload) => api.put(`/stops/${id}`, payload).then(r => r.data);
export const deleteStop = (id) => api.delete(`/stops/${id}`).then(r => r.data);
