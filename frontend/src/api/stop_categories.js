import { api } from "./client";

export const getStopCategories = () => api.get('/stop_categories').then(r => r.data);
export const createStopCategory = (payload) => api.post('/stop_categories', payload).then(r => r.data);
export const deleteStopCategory = (id) => api.delete(`/stop_categories/${id}`).then(r => r.data);