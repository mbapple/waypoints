import { api } from './client';

// Admin DB backup APIs (no auth/token required now)

export const listBackups = () => api.get('/admin/db/backups').then(r => r.data);
export const createBackup = () => api.post('/admin/db/backup').then(r => r.data);
export const downloadBackup = (filename) => api.get(`/admin/db/backups/${encodeURIComponent(filename)}`, { responseType: 'blob' }).then(r => ({ blob: r.data, filename }));
export const restoreBackupFromFilename = (filename) => api.post(`/admin/db/restore?filename=${encodeURIComponent(filename)}`).then(r => r.data);
export const restoreBackupFromFile = (file) => {
  const form = new FormData();
  form.append('file', file, file.name);
  return api.post('/admin/db/restore', form).then(r => r.data);
};
