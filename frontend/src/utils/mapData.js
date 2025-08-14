import L from "leaflet";
import polylineCodec from "@mapbox/polyline";
import { getTripColor } from "../styles/mapTheme";
import { curvedFlightPath } from "./map_helper_functions";

// Build map layers for the all-trips view
export function buildMapLayersForAllTrips({ nodesByTrip, legsByTrip, stopsByTrip, carPolylineByLeg }) {
  const markers = [];
  const stopMarkers = [];
  const polylines = [];
  const latlngsForBounds = [];
  const visitedCountries = new Set();
  const visitedStates = new Set();

  const nodeById = {};
  Object.values(nodesByTrip || {}).forEach((arr) => {
    (arr || []).forEach((n) => {
      nodeById[n.id] = n;
      if (isFinite(n.latitude) && isFinite(n.longitude)) {
        markers.push({ id: n.id, name: n.name, pos: [n.latitude, n.longitude], tripId: n.trip_id });
        latlngsForBounds.push([n.latitude, n.longitude]);
      }
      if (n.osm_country) visitedCountries.add(n.osm_country);
      if (n.osm_state) visitedStates.add(n.osm_state);
    });
  });

  const legById = {};
  Object.values(legsByTrip || {}).forEach((arr) => {
    (arr || []).forEach((l) => { if (l?.id) legById[l.id] = l; });
  });

  const stopsByNodeId = {};
  Object.entries(stopsByTrip || {}).forEach(([tripIdStr, stops]) => {
    const tripId = Number(tripIdStr);
    (stops || []).forEach((s) => {
      if (isFinite(s.latitude) && isFinite(s.longitude)) {
        let visited = null;
        if (s.leg_id && legById[s.leg_id]?.date) visited = legById[s.leg_id].date;
        else if (s.node_id && nodeById[s.node_id]?.arrival_date) visited = nodeById[s.node_id].arrival_date;
        stopMarkers.push({ id: s.id, name: s.name, category: s.category, pos: [s.latitude, s.longitude], visited, notes: s.notes, tripId });
        latlngsForBounds.push([s.latitude, s.longitude]);
        if (s.node_id) (stopsByNodeId[s.node_id] ||= []).push(s);
        if (s.osm_country) visitedCountries.add(s.osm_country);
        if (s.osm_state) visitedStates.add(s.osm_state);
      }
    });
  });

  function legEndpoints(leg) {
    const startLat = leg.start_latitude ?? nodeById[leg.start_node_id]?.latitude;
    const startLng = leg.start_longitude ?? nodeById[leg.start_node_id]?.longitude;
    const endLat = leg.end_latitude ?? nodeById[leg.end_node_id]?.latitude;
    const endLng = leg.end_longitude ?? nodeById[leg.end_node_id]?.longitude;
    if ([startLat, startLng, endLat, endLng].every((v) => typeof v === "number" && isFinite(v))) {
      return [[startLat, startLng], [endLat, endLng]];
    }
    return null;
  }

  Object.entries(legsByTrip || {}).forEach(([tripIdStr, legs]) => {
    const tripId = Number(tripIdStr);
    const color = getTripColor(tripId);
    (legs || []).forEach((leg) => {
      const type = (leg.type || "").toLowerCase();
      const endpoints = legEndpoints(leg);
      if (!endpoints) return;
      const [start, end] = endpoints;

      if (type === "car") {
        const encoded = carPolylineByLeg?.[leg.id];
        if (encoded) {
          try {
            const decoded = polylineCodec.decode(encoded).map(([lat, lng]) => [lat, lng]);
            if (decoded.length >= 2) {
              polylines.push({ positions: decoded, color, tripId, type });
              decoded.forEach((p) => latlngsForBounds.push(p));
              return;
            }
          } catch {}
        }
        polylines.push({ positions: [start, end], color, tripId, type });
        latlngsForBounds.push(start, end);
      } else if (type === "flight") {
        const curve = curvedFlightPath(start, end, 0.25);
        polylines.push({ positions: curve, color, tripId, type });
        latlngsForBounds.push(...curve);
      } else {
        polylines.push({ positions: [start, end], color, tripId, type });
        latlngsForBounds.push(start, end);
      }
    });
  });

  const bounds = latlngsForBounds.length ? L.latLngBounds(latlngsForBounds) : L.latLngBounds([[20, 0], [50, 30]]);
  return { markers, stopMarkers, polylines, bounds, nodeById, stopsByNodeId, visitedCountries, visitedStates };
}

// Build map layers for a single trip view
export function buildMapLayersForTrip({ nodes, legs, stops, carPolylineByLeg, tripID }) {
  const markers = [];
  const stopMarkers = [];
  const polylines = [];
  const latlngsForBounds = [];
  const visitedCountries = new Set();
  const visitedStates = new Set();

  const nodeById = {};
  (nodes || []).forEach((n) => {
    nodeById[n.id] = n;
    if (isFinite(n.latitude) && isFinite(n.longitude)) {
      markers.push({ id: n.id, name: n.name, pos: [n.latitude, n.longitude], tripId: Number(tripID) });
      latlngsForBounds.push([n.latitude, n.longitude]);
    }
    if (n.osm_country) visitedCountries.add(n.osm_country);
    if (n.osm_state) visitedStates.add(n.osm_state);
  });

  const legById = {};
  (legs || []).forEach((l) => { if (l?.id) legById[l.id] = l; });

  (stops || []).forEach((s) => {
    if (isFinite(s.latitude) && isFinite(s.longitude)) {
      let visited = null;
      if (s.leg_id && legById[s.leg_id]?.date) visited = legById[s.leg_id].date;
      else if (s.node_id && nodeById[s.node_id]?.arrival_date) visited = nodeById[s.node_id].arrival_date;
      stopMarkers.push({ id: s.id, name: s.name, category: s.category, pos: [s.latitude, s.longitude], visited, notes: s.notes, tripId: Number(tripID) });
      latlngsForBounds.push([s.latitude, s.longitude]);
      if (s.osm_country) visitedCountries.add(s.osm_country);
      if (s.osm_state) visitedStates.add(s.osm_state);
    }
  });

  function legEndpoints(leg) {
    const startLat = leg.start_latitude ?? nodeById[leg.start_node_id]?.latitude;
    const startLng = leg.start_longitude ?? nodeById[leg.start_node_id]?.longitude;
    const endLat = leg.end_latitude ?? nodeById[leg.end_node_id]?.latitude;
    const endLng = leg.end_longitude ?? nodeById[leg.end_node_id]?.longitude;
    if ([startLat, startLng, endLat, endLng].every((v) => typeof v === "number" && isFinite(v))) {
      return [[startLat, startLng], [endLat, endLng]];
    }
    return null;
  }

  const color = getTripColor(Number(tripID));
  (legs || []).forEach((leg) => {
    const type = (leg.type || "").toLowerCase();
    const endpoints = legEndpoints(leg);
    if (!endpoints) return;
    const [start, end] = endpoints;
    if (type === "car") {
      const encoded = carPolylineByLeg?.[leg.id];
      if (encoded) {
        try {
          const decoded = polylineCodec.decode(encoded).map(([lat, lng]) => [lat, lng]);
          if (decoded.length >= 2) {
            polylines.push({ positions: decoded, color, type });
            decoded.forEach((p) => latlngsForBounds.push(p));
            return;
          }
        } catch {}
      }
      polylines.push({ positions: [start, end], color, type });
      latlngsForBounds.push(start, end);
    } else if (type === "flight") {
      const curve = curvedFlightPath(start, end, 0.25);
      polylines.push({ positions: curve, color, type });
      latlngsForBounds.push(...curve);
    } else {
      polylines.push({ positions: [start, end], color, type });
      latlngsForBounds.push(start, end);
    }
  });

  const bounds = latlngsForBounds.length ? L.latLngBounds(latlngsForBounds) : L.latLngBounds([[20, 0], [50, 30]]);
  return { markers, stopMarkers, polylines, bounds, nodeById, visitedCountries, visitedStates };
}
