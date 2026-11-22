import { api } from "./client";

export const uploadPhoto = (formData) => api.post('/photos/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data);

export const listPhotosByTrip = (tripID) => api.get(`/photos/by_trip/${tripID}`).then(r => r.data);
export const listPhotosByLeg = (legID) => api.get(`/photos/by_leg/${legID}`).then(r => r.data);
export const listPhotosByNode = (nodeID) => api.get(`/photos/by_node/${nodeID}`).then(r => r.data);
export const listPhotosByStop = (stopID) => api.get(`/photos/by_stop/${stopID}`).then(r => r.data);
export const listPhotosByAdventure = (adventureID) => api.get(`/photos/by_adventure/${adventureID}`).then(r => r.data);
// One random trip/adventure photo per day in [start, end] (YYYY-MM-DD, inclusive)
export const listCalendarPhotos = (start, end) => api.get('/photos/calendar', { params: { start, end } }).then(r => r.data);
export const deletePhoto = (id) => api.delete(`/photos/${id}`).then(r => r.data);
// Newest few photos of every trip or adventure in one request: { [id]: photos[] } (kind: 'trip' | 'adventure')
export const listCoverPhotos = (kind) => api.get('/photos/covers', { params: { kind } }).then(r => r.data);
