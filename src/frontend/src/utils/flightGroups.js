// Grouping and totals for the Flight Data page. Input: rows from GET /api/flights.
import { aircraftTypeName, aircraftLabel } from "./aircraftTypes";
import { formatDateRange } from "./format";

const upper = (v) => (v || "").trim().toUpperCase();
const sumMiles = (flights) => flights.reduce((s, f) => s + (Number(f.miles) || 0), 0);

// Airline name, or the flight number's 2-letter prefix when no name was saved
export const airlineName = (f) =>
  (f.airline || "").trim() || (upper(f.flight_number).replace(/\s+/g, "").match(/^[A-Z0-9]{2}(?=\d)/)?.[0] ?? "");

export const routeLabel = (f) =>
  `${f.start_airport || f.start_name || "?"} → ${f.end_airport || f.end_name || "?"}`;

// Each grouping: how to key a flight, and how to name/describe its group
export const GROUPINGS = {
  types: {
    label: "Aircraft types",
    key: (f) => upper(f.aircraft_icao_type),
    name: (key, f) => aircraftTypeName(key, f.aircraft_type),
  },
  airlines: {
    label: "Airlines",
    key: (f) => airlineName(f).toLowerCase(),
    name: (key, f) => airlineName(f),
  },
  aircraft: {
    label: "Aircraft",
    key: (f) => upper(f.aircraft_registration),
    name: (key) => key,
    detail: (f) => aircraftTypeName(f.aircraft_icao_type, f.aircraft_type),
  },
  flights: {
    label: "Flights",
    key: (f) => String(f.leg_id),
    name: (key, f) => [f.flight_number, routeLabel(f)].filter(Boolean).join(" · "),
    detail: (f) => [formatDateRange(f.date, f.date), aircraftLabel(f)].filter(Boolean).join(" · "),
    chronological: true,
  },
};

// -> [{ key, name, detail, flights, miles, photo }] biggest first, "Unknown" last
// (the Flights grouping is one row per flight, newest first)
export function groupFlights(flights, groupingId) {
  const g = GROUPINGS[groupingId];
  const byKey = new Map();
  (flights || []).forEach((f) => {
    const key = g.key(f);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(f);
  });
  const groups = [...byKey.entries()].map(([key, list]) => {
    const first = list[0];
    return {
      key,
      name: key ? g.name(key, first) : "Unknown",
      detail: key && g.detail ? g.detail(first) : null,
      flights: list,
      miles: sumMiles(list),
      photo: list.find((f) => f.aircraft_photo) || null,
    };
  });
  if (g.chronological) return groups.reverse();
  return groups.sort((a, b) =>
    (!a.key - !b.key) || (b.flights.length - a.flights.length) || (b.miles - a.miles));
}

// Headline numbers for the stat tiles
export function flightStats(flights) {
  const distinct = (fn) => new Set(flights.map(fn).filter(Boolean)).size;
  const airports = new Set();
  flights.forEach((f) => {
    [f.start_airport || f.start_name, f.end_airport || f.end_name].forEach((a) => a && airports.add(upper(a)));
  });
  return {
    flights: flights.length,
    miles: sumMiles(flights),
    airlines: distinct((f) => airlineName(f).toLowerCase()),
    types: distinct((f) => upper(f.aircraft_icao_type)),
    aircraft: distinct((f) => upper(f.aircraft_registration)),
    airports: airports.size,
  };
}
