import { api } from "./client";

export const listNodesByTrip = (tripID) => api.get(`/nodes/by_trip/${tripID}`).then(r => r.data);
export const getNode = (id) => api.get(`/nodes/${id}`).then(r => r.data);
export const createNode = (payload) => api.post('/nodes', payload).then(r => r.data);
export const updateNode = (id, payload) => api.put(`/nodes/${id}`, payload).then(r => r.data);
export const deleteNode = (id) => api.delete(`/nodes/${id}`).then(r => r.data);
