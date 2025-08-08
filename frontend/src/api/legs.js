import { api } from "./client";

export const listLegsByTrip = (tripID) => api.get(`/legs/by_trip/${tripID}`).then(r => r.data);
export const getLeg = (id) => api.get(`/legs/${id}`).then(r => r.data);
export const createLeg = (payload) => api.post('/legs', payload).then(r => r.data);
export const updateLeg = (id, payload) => api.put(`/legs/${id}`, payload).then(r => r.data);
export const deleteLeg = (id) => api.delete(`/legs/${id}`).then(r => r.data);

export const getCarDetails = (legID) => api.get(`/car_details/${legID}`).then(r => r.data);
export const createCarDetails = (payload) => api.post('/car_details', payload).then(r => r.data);

export const getFlightDetails = (legID) => api.get(`/flight_details/${legID}`).then(r => r.data);
export const createFlightDetails = (payload) => api.post('/flight_details', payload).then(r => r.data);
