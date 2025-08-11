import { api } from "./client";

export const uploadPhoto = (formData) => api.post('/photos/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data);

export const listPhotosByTrip = (tripID) => api.get(`/photos/by_trip/${tripID}`).then(r => r.data);
export const listPhotosByLeg = (legID) => api.get(`/photos/by_leg/${legID}`).then(r => r.data);
export const listPhotosByNode = (nodeID) => api.get(`/photos/by_node/${nodeID}`).then(r => r.data);
export const listPhotosByStop = (stopID) => api.get(`/photos/by_stop/${stopID}`).then(r => r.data);
export const deletePhoto = (id) => api.delete(`/photos/${id}`).then(r => r.data);
