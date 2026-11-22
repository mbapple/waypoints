// Quick Create Trip: form state holds only what the user typed (blank = "auto").
// resolveQuickTrip() derives every effective value (dates, names, leg types,
// endpoints, miles, airport codes) from it, so the page has no cascading effects.
import { haversineMiles } from "./geo";
import { placeToOsmFields, placeToLegStart, placeToLegEnd } from "./places";

export const TRANSPORT_TYPES = ["flight", "car", "train", "bus", "boat", "other"];
export const ROAD_TYPES = new Set(["car", "bus"]); // routed with OpenRouteService
export const NEAREST_AIRPORT_MAX_MILES = 60;

let seq = 0;
const newUid = () => `q${Date.now().toString(36)}${(seq++).toString(36)}`;

export function emptyNode() {
  return {
    uid: newUid(),
    name: "",
    ...placeToOsmFields({}),
    arrivalDate: "",
    departureDate: "",
    nights: "",
    invisible: false,
  };
}

export function emptyLeg() {
  return {
    type: "",
    date: "",
    miles: "",
    notes: "",
    ...placeToLegStart({}), // manual endpoint overrides
    ...placeToLegEnd({}),
    startAirport: null, // { latitude, longitude, name, iata, icao, country } from a flight lookup
    endAirport: null,
    car: null, // { key, miles, driving_time_seconds, polyline } from CarDetails, valid for endpoints `key`
    flight: null, // { flight_number, airline, start_airport, end_airport, flight_polyline, flight_track_source }
  };
}

export function initialQuickTripState() {
  return {
    trip: { name: "", startDate: "", endDate: "", description: "", roundTrip: false },
    nodes: [emptyNode(), emptyNode()],
    returnNode: { arrivalDate: "" }, // the round-trip return stop (a copy of the first stop)
    legs: {}, // keyed by the uid of the leg's start node
  };
}

// --- date helpers (YYYY-MM-DD strings, UTC so DST can't shift a day) ---------

const toUtc = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

export function addDays(date, days) {
  const t = toUtc(date);
  const n = Number(days);
  if (t == null || !Number.isFinite(n)) return "";
  return new Date(t + Math.round(n) * 86400000).toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  const a = toUtc(from);
  const b = toUtc(to);
  return a == null || b == null ? null : Math.round((b - a) / 86400000);
}

// --- place helpers -----------------------------------------------------------

const num = (v) => (v === "" || v == null ? NaN : Number(v));
const hasCoords = (p) => Number.isFinite(num(p?.lat)) && Number.isFinite(num(p?.lon));

const samePlace = (a, b) =>
  Boolean(a && b) && (
    (a.osmID && a.osmID === b.osmID) ||
    (Number.isFinite(num(a.latitude)) && num(a.latitude) === num(b.latitude) && num(a.longitude) === num(b.longitude))
  );

// Closest previously used airport (with a code) within maxMiles, as its code
export function nearestAirport(lat, lon, airports, maxMiles = NEAREST_AIRPORT_MAX_MILES) {
  if (!Number.isFinite(num(lat)) || !Number.isFinite(num(lon)) || !airports?.length) return "";
  let best = null;
  for (const a of airports) {
    if (!a?.code || !Number.isFinite(num(a.latitude)) || !Number.isFinite(num(a.longitude))) continue;
    const d = haversineMiles(num(lat), num(lon), num(a.latitude), num(a.longitude));
    if (d <= maxMiles && (!best || d < best.d)) best = { d, code: a.code };
  }
  return best ? best.code : "";
}

// "Rome 2026", "Paris & Rome 2026", "Paris, Rome & Milan 2026", "Paris + 3 more 2026"
export function suggestTripName(nodes, startDate) {
  if (!nodes.length) return "";
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  let stops = nodes.slice(1);
  if (nodes.length > 1 && samePlace(first, last)) stops = stops.slice(0, -1);
  stops = stops.filter(n => !n.invisible);
  if (!stops.length) stops = nodes.length > 1 ? [last] : [];
  const names = [...new Set(stops.map(n => n.name).filter(Boolean))];
  if (!names.length) return "";
  let label;
  if (names.length === 1) label = names[0];
  else if (names.length === 2) label = `${names[0]} & ${names[1]}`;
  else if (names.length === 3) label = `${names[0]}, ${names[1]} & ${names[2]}`;
  else label = `${names[0]} + ${names.length - 1} more`;
  const year = (startDate || "").slice(0, 4);
  return /^\d{4}$/.test(year) ? `${label} ${year}` : label;
}

const nodeEndpoint = (n) => ({
  lat: n.latitude, lon: n.longitude,
  osm_name: n.osmName, osm_id: n.osmID, osm_country: n.osmCountry, osm_state: n.osmState,
  source: "node",
});

const airportEndpoint = (a) => ({
  lat: a.latitude, lon: a.longitude,
  osm_name: a.name || a.iata || a.icao || "", osm_id: "", osm_country: a.country || "", osm_state: "",
  source: "airport",
});

function legEndpoint(leg, prefix, node) {
  if (Number.isFinite(num(leg[`${prefix}_latitude`])) && Number.isFinite(num(leg[`${prefix}_longitude`]))) {
    return {
      lat: leg[`${prefix}_latitude`], lon: leg[`${prefix}_longitude`],
      osm_name: leg[`${prefix}_osm_name`], osm_id: leg[`${prefix}_osm_id`],
      osm_country: leg[`${prefix}_osm_country`], osm_state: leg[`${prefix}_osm_state`],
      source: "override",
    };
  }
  const airport = prefix === "start" ? leg.startAirport : leg.endAirport;
  if (leg.type === "flight" && airport && Number.isFinite(num(airport.latitude)) && Number.isFinite(num(airport.longitude))) {
    return airportEndpoint(airport);
  }
  return nodeEndpoint(node);
}

export const endpointKey = (start, end) =>
  hasCoords(start) && hasCoords(end) ? `${num(start.lat)},${num(start.lon)}|${num(end.lat)},${num(end.lon)}` : "";

// --- resolver ----------------------------------------------------------------

// Returns { trip, nodes, legs, errors, errorList }. Every resolved field has its
// effective value plus an `auto` flag map saying which ones were derived.
export function resolveQuickTrip(state, { airports = [] } = {}) {
  const { trip, nodes, returnNode, legs } = state;
  const effective = trip.roundTrip && nodes.length
    ? [...nodes, { ...nodes[0], uid: "return", name: "", arrivalDate: returnNode.arrivalDate, departureDate: "", nights: "", invisible: false, isReturn: true }]
    : nodes;

  const errors = {};
  const errorList = [];
  const addError = (key, message) => {
    if (!errors[key]) {
      errors[key] = message;
      errorList.push({ key, message });
    }
  };

  const rNodes = [];
  const rLegs = [];
  let prevType = "";

  effective.forEach((n, i) => {
    const isFirst = i === 0;
    const isLast = i === effective.length - 1;
    const legState = legs[n.uid] || emptyLeg();
    const auto = {};

    // Name: the return stop mirrors the first stop's effective name
    let name = n.name.trim();
    if (n.isReturn) name = rNodes[0]?.name || "";
    else if (!name) { name = n.shortName || (n.osmName || "").split(",")[0].trim(); auto.name = Boolean(name); }

    let arrival;
    let departure;
    if (isFirst) {
      departure = n.departureDate || trip.startDate || (!isLast ? legState.date : "") || "";
      auto.departure = !n.departureDate && Boolean(departure);
      arrival = n.arrivalDate || departure; // first stop needs an arrival date: nodes sort by it
      auto.arrival = !n.arrivalDate && Boolean(arrival);
    } else {
      arrival = n.arrivalDate || rLegs[i - 1]?.date || "";
      auto.arrival = !n.arrivalDate && Boolean(arrival);
      if (isLast) {
        departure = n.departureDate || "";
      } else {
        // An explicit date on the outgoing leg wins over nights
        const fromNights = n.nights !== "" && arrival ? addDays(arrival, n.nights) : "";
        departure = n.departureDate || legState.date || fromNights || "";
      }
      auto.departure = !n.departureDate && Boolean(departure);
    }
    const derivedNights = arrival && departure ? daysBetween(arrival, departure) : null;
    const nights = derivedNights != null && derivedNights >= 0 ? String(derivedNights) : n.nights;
    auto.nights = nights !== "" && String(n.nights) !== nights;

    const rNode = { ...n, name, arrival, departure, nights, auto, isFirst, isLast };
    rNodes.push(rNode);

    if (!n.isReturn) {
      if (!Number.isFinite(num(n.latitude)) || !Number.isFinite(num(n.longitude))) {
        addError(`node.${n.uid}.place`, `Stop ${i + 1}: pick a place from the search results`);
      } else if (!name) {
        addError(`node.${n.uid}.name`, `Stop ${i + 1}: add a display name`);
      }
    }
    if (arrival && departure && departure < arrival) {
      addError(`node.${n.uid}.departure`, `${name || `Stop ${i + 1}`}: departure is before arrival`);
    }

    if (isLast) return;

    // Leg from this stop to the next
    const to = effective[i + 1];
    const legAuto = {};
    const type = legState.type || prevType;
    legAuto.type = !legState.type && Boolean(type);
    prevType = type;
    const date = legState.date || departure;
    legAuto.date = !legState.date && Boolean(date);

    const legWithType = { ...legState, type };
    const start = legEndpoint(legWithType, "start", n);
    const end = legEndpoint(legWithType, "end", to);
    const key = endpointKey(start, end);
    const car = ROAD_TYPES.has(type) && legState.car && legState.car.key === key ? legState.car : null;

    let miles = legState.miles;
    let milesSource = miles !== "" ? "manual" : "";
    if (miles === "" && key) {
      if (car && Number.isFinite(num(car.miles))) {
        miles = num(car.miles).toFixed(1);
        milesSource = "road";
      } else {
        miles = haversineMiles(num(start.lat), num(start.lon), num(end.lat), num(end.lon)).toFixed(1);
        milesSource = ROAD_TYPES.has(type) ? "straight-line" : "great-circle";
      }
    }
    legAuto.miles = milesSource !== "manual" && miles !== "";

    const fromName = rNode.name || `Stop ${i + 1}`;
    const toName = (to.isReturn ? rNodes[0]?.name : (to.name.trim() || to.shortName)) || `Stop ${i + 2}`;
    if (!type) addError(`leg.${n.uid}.type`, `${fromName} → ${toName}: choose how you travelled`);
    if (!date) {
      // A first leg without a date means no trip start date, which is reported below
      if (!isFirst) addError(`leg.${n.uid}.date`, `${fromName} → ${toName}: set a date, or the nights/departure at ${fromName}`);
    } else if (rLegs.length && rLegs[rLegs.length - 1].date && date < rLegs[rLegs.length - 1].date) {
      addError(`leg.${n.uid}.date`, `${fromName} → ${toName}: date is before the previous leg`);
    }

    rLegs.push({
      ...legState,
      uid: n.uid,
      index: i,
      type,
      date,
      miles,
      milesSource,
      start,
      end,
      key,
      car,
      fromName,
      toName,
      auto: legAuto,
      defaultStartAirport: nearestAirport(n.latitude, n.longitude, airports),
      defaultEndAirport: nearestAirport(to.latitude, to.longitude, airports),
    });
  });

  const rTrip = { ...trip, auto: {} };
  rTrip.startDate = trip.startDate || rNodes[0]?.departure || rLegs[0]?.date || "";
  rTrip.auto.startDate = !trip.startDate && Boolean(rTrip.startDate);
  rTrip.endDate = trip.endDate || rNodes[rNodes.length - 1]?.arrival || "";
  rTrip.auto.endDate = !trip.endDate && Boolean(rTrip.endDate);
  rTrip.suggestedName = suggestTripName(rNodes, rTrip.startDate);
  rTrip.name = trip.name.trim() || rTrip.suggestedName;
  rTrip.auto.name = !trip.name.trim() && Boolean(rTrip.name);

  // Trip-level errors go first in the summary
  const tripErrors = [];
  if (!rTrip.name) tripErrors.push({ key: "trip.name", message: "Add a trip name (or pick places to get a suggestion)" });
  if (!rTrip.startDate) tripErrors.push({ key: "trip.startDate", message: "Set the start date" });
  if (!rTrip.endDate) tripErrors.push({ key: "trip.endDate", message: "Set the end date (or the last leg's date)" });
  if (rTrip.startDate && rTrip.endDate && rTrip.endDate < rTrip.startDate) {
    tripErrors.push({ key: "trip.endDate", message: "The end date is before the start date" });
  }
  if (nodes.length < 2) tripErrors.push({ key: "trip.nodes", message: "Add at least two stops" });
  tripErrors.forEach(e => { errors[e.key] = errors[e.key] || e.message; });

  return { trip: rTrip, nodes: rNodes, legs: rLegs, errors, errorList: [...tripErrors, ...errorList] };
}

// --- payload for POST /api/trips/quick ---------------------------------------

const orNull = (v) => (v === "" || v == null ? null : v);
const numOrNull = (v) => (Number.isFinite(num(v)) ? num(v) : null);

export function buildQuickTripPayload(resolved) {
  const { trip, nodes, legs } = resolved;
  return {
    trip: {
      name: trip.name,
      start_date: trip.startDate,
      end_date: trip.endDate,
      description: orNull(trip.description?.trim()),
    },
    nodes: nodes.map(n => ({
      name: n.name,
      arrival_date: orNull(n.arrival),
      departure_date: orNull(n.departure),
      latitude: numOrNull(n.latitude),
      longitude: numOrNull(n.longitude),
      osm_name: orNull(n.osmName),
      osm_id: orNull(n.osmID),
      osm_country: orNull(n.osmCountry),
      osm_state: orNull(n.osmState),
      invisible: Boolean(n.invisible),
    })),
    legs: legs.map(l => ({
      start_index: l.index,
      end_index: l.index + 1,
      type: l.type,
      date: l.date,
      notes: orNull(l.notes?.trim()),
      start_latitude: numOrNull(l.start.lat),
      start_longitude: numOrNull(l.start.lon),
      end_latitude: numOrNull(l.end.lat),
      end_longitude: numOrNull(l.end.lon),
      start_osm_name: orNull(l.start.osm_name),
      start_osm_id: orNull(l.start.osm_id),
      start_osm_country: orNull(l.start.osm_country),
      start_osm_state: orNull(l.start.osm_state),
      end_osm_name: orNull(l.end.osm_name),
      end_osm_id: orNull(l.end.osm_id),
      end_osm_country: orNull(l.end.osm_country),
      end_osm_state: orNull(l.end.osm_state),
      miles: numOrNull(l.miles),
      car: ROAD_TYPES.has(l.type)
        ? {
          driving_time_seconds: Number.isFinite(num(l.car?.driving_time_seconds)) ? Math.round(num(l.car.driving_time_seconds)) : null,
          polyline: orNull(l.car?.polyline),
        }
        : null,
      flight: l.type === "flight"
        ? {
          flight_number: orNull(l.flight?.flight_number?.trim()),
          airline: orNull(l.flight?.airline?.trim()),
          start_airport: orNull(l.flight?.start_airport?.trim()?.toUpperCase()),
          end_airport: orNull(l.flight?.end_airport?.trim()?.toUpperCase()),
          polyline: orNull(l.flight?.flight_polyline),
          track_source: l.flight?.flight_polyline ? orNull(l.flight?.flight_track_source) : null,
        }
        : null,
    })),
  };
}
