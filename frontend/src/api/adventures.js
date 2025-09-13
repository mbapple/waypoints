import { api } from "./client";

export const listAdventures = () => api.get('/adventures').then(r => r.data);
export const getAdventure = (id) => api.get(`/adventures/${id}`).then(r => r.data);
export const createAdventure = (payload) => api.post('/adventures', payload).then(r => r.data);
export const updateAdventure = (id, payload) => api.put(`/adventures/${id}`, payload).then(r => r.data);
export const deleteAdventure = (id) => api.delete(`/adventures/${id}`).then(r => r.data);

const adventuresApi = { listAdventures, getAdventure, createAdventure, updateAdventure, deleteAdventure };
export default adventuresApi;