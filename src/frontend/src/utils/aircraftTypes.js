// Friendly names for common ICAO aircraft type designators. Registries describe
// airframes by customer variant ("777 236ER"), so grouping uses the ICAO code
// and shows the family name from here.
const TYPE_NAMES = {
  A20N: "Airbus A320neo", A21N: "Airbus A321neo", A319: "Airbus A319", A320: "Airbus A320",
  A321: "Airbus A321", A318: "Airbus A318", A332: "Airbus A330-200", A333: "Airbus A330-300",
  A338: "Airbus A330-800neo", A339: "Airbus A330-900neo", A343: "Airbus A340-300",
  A346: "Airbus A340-600", A359: "Airbus A350-900", A35K: "Airbus A350-1000",
  A388: "Airbus A380-800", BCS1: "Airbus A220-100", BCS3: "Airbus A220-300",
  B737: "Boeing 737-700", B738: "Boeing 737-800", B739: "Boeing 737-900",
  B37M: "Boeing 737 MAX 7", B38M: "Boeing 737 MAX 8", B39M: "Boeing 737 MAX 9", B3XM: "Boeing 737 MAX 10",
  B744: "Boeing 747-400", B748: "Boeing 747-8", B752: "Boeing 757-200", B753: "Boeing 757-300",
  B762: "Boeing 767-200", B763: "Boeing 767-300", B764: "Boeing 767-400",
  B772: "Boeing 777-200", B77L: "Boeing 777-200LR", B77W: "Boeing 777-300ER", B773: "Boeing 777-300",
  B778: "Boeing 777-8", B779: "Boeing 777-9",
  B788: "Boeing 787-8", B789: "Boeing 787-9", B78X: "Boeing 787-10",
  E170: "Embraer 170", E75L: "Embraer 175", E190: "Embraer 190", E195: "Embraer 195",
  E290: "Embraer E190-E2", E295: "Embraer E195-E2",
  CRJ7: "Bombardier CRJ700", CRJ9: "Bombardier CRJ900", CRJX: "Bombardier CRJ1000",
  DH8D: "De Havilland Dash 8-400", AT72: "ATR 72", AT76: "ATR 72-600", AT45: "ATR 42-500",
};

// "B772" (+ registry text "Boeing 777 236ER") -> "Boeing 777-200"
export function aircraftTypeName(icaoType, typeText) {
  const code = (icaoType || "").toUpperCase();
  return TYPE_NAMES[code] || typeText || code || "";
}

// One line for a flight's aircraft: "Boeing 777-200 · G-YMMN"
export function aircraftLabel(flight) {
  const name = aircraftTypeName(flight?.aircraft_icao_type, flight?.aircraft_type);
  return [name, flight?.aircraft_registration].filter(Boolean).join(" · ");
}
