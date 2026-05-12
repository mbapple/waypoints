import { api } from './client';

export const listLists = () => api.get('/lists').then(r => r.data);
export const getList = (id) => api.get(`/lists/${id}`).then(r => r.data);
export const createList = (payload) => api.post('/lists', payload).then(r => r.data);
export const updateList = (id, payload) => api.put(`/lists/${id}`, payload).then(r => r.data);
export const deleteList = (id) => api.delete(`/lists/${id}`).then(r => r.data);

// Overrides
export const addOverride = (id, item) => api.post(`/lists/${id}/overrides`, { item }).then(r => r.data);
export const removeOverride = (id, item) => api.delete(`/lists/${id}/overrides`, { params: { item } }).then(r => r.data);

const listsApi = { listLists, getList, createList, updateList, deleteList, addOverride, removeOverride };
export default listsApi;
