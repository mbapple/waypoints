import { api } from "./client";

// List all stop categories (returns [{ id, name, emoji, created_at, updated_at }, ...])
export const getStopCategories = () => api.get('/stop_categories').then(r => r.data);

// Create a category: payload = { name: string, emoji?: string }
export const createStopCategory = (payload) => api.post('/stop_categories', payload).then(r => r.data);

// Update a category's emoji (or other future partial fields): update = { emoji?: string }
export const updateStopCategory = (identifier, update) => api.patch(`/stop_categories/${identifier}`, update).then(r => r.data);

// Delete by id or name (backend supports either)
export const deleteStopCategory = (identifier) => api.delete(`/stop_categories/${identifier}`).then(r => r.data);