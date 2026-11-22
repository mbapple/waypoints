// Flight details: the one place that maps leg form state <-> /api/flight_details.
// Form keys match the API columns, except the track, which is namespaced
// (flight_polyline / flight_track_source) so it can't clash with a car route.

const TRACK_KEYS = { flight_polyline: "polyline", flight_track_source: "track_source" };

export const AIRCRAFT_KEYS = [
  "aircraft_icao24",
  "aircraft_registration",
  "aircraft_type",
  "aircraft_icao_type",
  "aircraft_photo",
  "aircraft_photo_credit",
  "aircraft_photo_link",
];

export const FLIGHT_FORM_KEYS = [
  "flight_number", "airline", "start_airport", "end_airport",
  ...Object.keys(TRACK_KEYS),
  ...AIRCRAFT_KEYS,
];

const apiKey = (formKey) => TRACK_KEYS[formKey] || formKey;
const UPPERCASE = new Set(["start_airport", "end_airport", "aircraft_registration", "aircraft_icao_type"]);

export const emptyFlightForm = () => Object.fromEntries(FLIGHT_FORM_KEYS.map((k) => [k, ""]));

// Only the flight keys present in `data` (e.g. a FlightDetails onAutoFill patch)
export const pickFlightFields = (data) =>
  Object.fromEntries(FLIGHT_FORM_KEYS.filter((k) => data?.[k] !== undefined).map((k) => [k, data[k]]));

// GET /api/flight_details/:leg -> form state
export const flightDetailsToForm = (details) =>
  Object.fromEntries(FLIGHT_FORM_KEYS.map((k) => [k, details?.[apiKey(k)] ?? ""]));

// Form state -> POST /api/flight_details (without leg_id) or the quick-create `flight` object
export function flightFormToPayload(form) {
  const payload = {};
  FLIGHT_FORM_KEYS.forEach((k) => {
    let v = typeof form?.[k] === "string" ? form[k].trim() : form?.[k];
    if (v && UPPERCASE.has(k)) v = v.toUpperCase();
    payload[apiKey(k)] = v || null;
  });
  if (!payload.polyline) payload.track_source = null;
  return payload;
}

// GET /api/integrations/aircraft (or flight-track's `aircraft`) -> aircraft form fields
export const aircraftFromLookup = (a) => ({
  aircraft_icao24: a?.icao24 || "",
  aircraft_registration: a?.registration || "",
  aircraft_type: a?.type || "",
  aircraft_icao_type: a?.icao_type || "",
  aircraft_photo: a?.photo?.url || "",
  aircraft_photo_credit: a?.photo?.credit || "",
  aircraft_photo_link: a?.photo?.link || "",
});
