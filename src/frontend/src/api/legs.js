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

// Stored route geometry for drawing legs on a map: road routes (car/bus) and
// recorded flight tracks, as { legId: encodedPolyline | null } maps.
export async function loadLegPolylines(legs) {
  const ofType = (...types) => (legs || []).filter((l) => l?.id && types.includes((l.type || "").toLowerCase()));
  const pairs = (legsToLoad, getDetails) => Promise.all(
    legsToLoad.map((leg) => getDetails(leg.id)
      .then((d) => [leg.id, d?.polyline || null])
      .catch(() => [leg.id, null]))
  );
  const [car, flight] = await Promise.all([
    pairs(ofType("car", "bus"), getCarDetails),
    pairs(ofType("flight"), getFlightDetails),
  ]);
  return { carPolylineByLeg: Object.fromEntries(car), flightPolylineByLeg: Object.fromEntries(flight) };
}
