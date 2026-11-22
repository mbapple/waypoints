import L from "leaflet";
import polylineCodec from "@mapbox/polyline";
import { getTripColor } from "../styles/mapTheme";
import { curvedFlightPath, flightTrackSegments } from "./map_helper_functions";

// A real coordinate pair. Global isFinite(null) is true (null coerces to 0), which let
// places without coordinates through as [null, null] markers and crashed Leaflet.
const hasCoords = (o) => typeof o?.latitude === "number" && typeof o?.longitude === "number"
  && Number.isFinite(o.latitude) && Number.isFinite(o.longitude);

// Flight leg -> [lat, lon] segments: the recorded track if one is stored
// (flight_details.polyline), otherwise the great-circle arc between the endpoints.
function flightSegments(start, end, encodedTrack) {
  if (encodedTrack) {
    try {
      const track = polylineCodec.decode(encodedTrack);
      if (track.length >= 2) return flightTrackSegments(track);
    } catch {}
  }
  const curve = curvedFlightPath(start, end, 128);
  return Array.isArray(curve[0]?.[0]) ? curve : [curve];
}

// Build map layers for the all-trips view
export function buildMapLayersForAllTrips({ nodesByTrip, legsByTrip, stopsByTrip, carPolylineByLeg, flightPolylineByLeg, adventures = [] }) {
  const markers = [];
  const stopMarkers = [];
  const polylines = [];
  const adventureMarkers = [];
  const latlngsForBounds = [];
  const visitedCountries = new Set();
  const visitedStates = new Set();

  const nodeById = {};
  Object.values(nodesByTrip || {}).forEach((arr) => {
    (arr || []).forEach((n) => {
      nodeById[n.id] = n;
      if (hasCoords(n) && !n.invisible) {
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
      if (hasCoords(s)) {
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

  if (type === "car" || type === "bus") {
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
        flightSegments(start, end, flightPolylineByLeg?.[leg.id]).forEach((seg) => {
          if (seg && seg.length >= 2) {
            polylines.push({ positions: seg, color, tripId, type });
            latlngsForBounds.push(...seg);
          }
        });
      } else {
        polylines.push({ positions: [start, end], color, tripId, type });
        latlngsForBounds.push(start, end);
      }
    });
  });

  // Adventures: global single-day points (not tied to trips)
  (adventures || []).forEach(a => {
    if (hasCoords(a)) {
      adventureMarkers.push({ id: a.id, name: a.name, category: a.category, pos: [a.latitude, a.longitude], start_date: a.start_date, end_date: a.end_date, notes: a.notes });
      latlngsForBounds.push([a.latitude, a.longitude]);
      if (a.osm_country) visitedCountries.add(a.osm_country);
      if (a.osm_state) visitedStates.add(a.osm_state);
    }
  });

  const bounds = latlngsForBounds.length ? L.latLngBounds(latlngsForBounds) : L.latLngBounds([[20, 0], [50, 30]]);
  return { markers, stopMarkers, adventureMarkers, polylines, bounds, nodeById, stopsByNodeId, visitedCountries, visitedStates };
}

// Build map layers for a single trip view
export function buildMapLayersForTrip({ nodes, legs, stops, carPolylineByLeg, flightPolylineByLeg, tripID }) {
  const markers = [];
  const stopMarkers = [];
  const polylines = [];
  const latlngsForBounds = [];
  const visitedCountries = new Set();
  const visitedStates = new Set();

  const nodeById = {};
  (nodes || []).forEach((n) => {
    nodeById[n.id] = n;
    if (hasCoords(n) && !n.invisible) {
      markers.push({ id: n.id, name: n.name, pos: [n.latitude, n.longitude], tripId: Number(tripID) });
      latlngsForBounds.push([n.latitude, n.longitude]);
    }
    if (n.osm_country) visitedCountries.add(n.osm_country);
    if (n.osm_state) visitedStates.add(n.osm_state);
  });

  const legById = {};
  (legs || []).forEach((l) => { if (l?.id) legById[l.id] = l; });

  (stops || []).forEach((s) => {
    if (hasCoords(s)) {
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
  if (type === "car" || type === "bus") {
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
      flightSegments(start, end, flightPolylineByLeg?.[leg.id]).forEach((seg) => {
        if (seg && seg.length >= 2) {
          polylines.push({ positions: seg, color, type });
          latlngsForBounds.push(...seg);
        }
      });
    } else {
      polylines.push({ positions: [start, end], color, type });
      latlngsForBounds.push(start, end);
    }
  });

  const bounds = latlngsForBounds.length ? L.latLngBounds(latlngsForBounds) : L.latLngBounds([[20, 0], [50, 30]]);
  return { markers, stopMarkers, polylines, bounds, nodeById, visitedCountries, visitedStates };
}

// Flight Data page: every flight leg, with the legs in `highlightIds` (a Set of
// leg ids) drawn bold on top and the rest faded. colors: { base, highlight }.
// -> { polylines, airports (placeMarkers for highlighted legs), bounds }
export function flightMapLayers(flights, highlightIds, colors) {
  const selecting = highlightIds?.size > 0;
  const lines = [];
  const airports = new Map();
  const latlngs = [];
  (flights || []).forEach((f) => {
    const start = [f.start_latitude, f.start_longitude];
    const end = [f.end_latitude, f.end_longitude];
    if (![...start, ...end].every((v) => typeof v === "number" && isFinite(v))) return;
    const on = selecting && highlightIds.has(f.leg_id);
    flightSegments(start, end, f.polyline).forEach((seg) => {
      if (seg.length < 2) return;
      lines.push({
        positions: seg,
        color: on ? colors.highlight : colors.base,
        weight: on ? 4 : 2.5,
        opacity: !selecting ? 0.85 : on ? 1 : 0.15,
        on,
      });
    });
    if (!selecting || on) latlngs.push(start, end);
    if (on) {
      [[start, f.start_airport, f.start_name], [end, f.end_airport, f.end_name]].forEach(([pos, code, name]) => {
        const key = code || pos.join(",");
        if (!airports.has(key)) airports.set(key, { key, code: code || null, name, pos, trips: [] });
      });
    }
  });
  lines.sort((a, b) => a.on - b.on); // highlighted legs draw last, on top
  const bounds = latlngs.length ? L.latLngBounds(latlngs) : L.latLngBounds([[20, 0], [50, 30]]);
  return { polylines: lines, airports: [...airports.values()], bounds };
}
