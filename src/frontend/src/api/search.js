import { api } from './client';

export const globalSearch = (query, limit = 50) => {
  if (!query || query.trim().length < 2) return Promise.resolve([]);
  return api.get('/search', { params: { q: query, limit } }).then(r => r.data);
};
