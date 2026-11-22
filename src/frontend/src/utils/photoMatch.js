// Suggest which node / leg / stop a photo belongs to, from its capture date and GPS.
//
// 1. Candidates are the items whose dates include the photo's (local) date:
//    nodes arrival..departure, legs on their date, stops start..end.
// 2. With GPS, the closest candidate wins. Legs are measured to the straight
//    line between their endpoints (so mid-journey photos land on the leg), plus
//    a small penalty so a photo taken in a town on a travel day goes to the town.
// 3. Without GPS, the first candidate wins, most specific first: shortest date
//    span, then stop, then leg, then node.
// 4. No date match: the closest item by GPS, else nothing (trip only).

const LEG_PENALTY_KM = 5;
const TYPE_RANK = { stop: 0, leg: 1, node: 2 };
const EARTH_KM = 6371;

const toRad = (d) => (d * Math.PI) / 180;
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const hasPoint = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon);

export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(a));
}

// Distance from point P to segment AB, using a local equirectangular projection around P.
function pointToSegmentKm(p, a, b) {
  const kx = Math.cos(toRad(p.lat)) * toRad(1) * EARTH_KM;
  const ky = toRad(1) * EARTH_KM;
  const ax = (a.lon - p.lon) * kx, ay = (a.lat - p.lat) * ky;
  const bx = (b.lon - p.lon) * kx, by = (b.lat - p.lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
  const cx = ax + t * dx, cy = ay + t * dy;
  // Fall back to great-circle distance to the endpoints when the projection is poor (long legs)
  const projected = Math.sqrt(cx * cx + cy * cy);
  const endpoints = Math.min(haversineKm(p.lat, p.lon, a.lat, a.lon), haversineKm(p.lat, p.lon, b.lat, b.lon));
  return Math.min(projected, endpoints);
}

const daySpan = (start, end) => {
  const ms = new Date(end) - new Date(start);
  return Number.isFinite(ms) ? Math.round(ms / 86400000) + 1 : 1;
};

function buildCandidates({ nodes = [], legs = [], stops = [] }) {
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const out = [];

  nodes.forEach((n, i) => {
    const start = n.arrival_date || n.departure_date;
    const end = n.departure_date || n.arrival_date;
    const lat = num(n.latitude), lon = num(n.longitude);
    out.push({
      type: 'node', id: n.id, order: i, start, end, name: n.name,
      distanceKm: hasPoint(lat, lon) ? (p) => haversineKm(p.lat, p.lon, lat, lon) : null,
    });
  });

  legs.forEach((l, i) => {
    const sn = nodeById.get(l.start_node_id), en = nodeById.get(l.end_node_id);
    const a = { lat: num(l.start_latitude ?? sn?.latitude), lon: num(l.start_longitude ?? sn?.longitude) };
    const b = { lat: num(l.end_latitude ?? en?.latitude), lon: num(l.end_longitude ?? en?.longitude) };
    const okA = hasPoint(a.lat, a.lon), okB = hasPoint(b.lat, b.lon);
    let distanceKm = null;
    if (okA && okB) distanceKm = (p) => pointToSegmentKm(p, a, b) + LEG_PENALTY_KM;
    else if (okA || okB) {
      const q = okA ? a : b;
      distanceKm = (p) => haversineKm(p.lat, p.lon, q.lat, q.lon) + LEG_PENALTY_KM;
    }
    out.push({
      type: 'leg', id: l.id, order: i, start: l.date, end: l.date,
      name: `${sn?.name || 'Start'} → ${en?.name || 'End'}`,
      distanceKm,
    });
  });

  stops.forEach((s, i) => {
    const start = s.start_date || s.end_date;
    const end = s.end_date || s.start_date;
    const lat = num(s.latitude), lon = num(s.longitude);
    out.push({
      type: 'stop', id: s.id, order: i, start, end, name: s.name,
      distanceKm: hasPoint(lat, lon) ? (p) => haversineKm(p.lat, p.lon, lat, lon) : null,
    });
  });

  return out;
}

const bySpecificity = (a, b) =>
  daySpan(a.start, a.end) - daySpan(b.start, b.end) ||
  TYPE_RANK[a.type] - TYPE_RANK[b.type] ||
  a.order - b.order;

function closest(candidates, point) {
  let best = null;
  for (const c of candidates) {
    if (!c.distanceKm) continue;
    const d = c.distanceKm(point);
    // Ties (within 10 m) go to the more specific item
    if (!best || d < best.d - 0.01 || (Math.abs(d - best.d) <= 0.01 && bySpecificity(c, best.c) < 0)) {
      best = { c, d };
    }
  }
  return best;
}

/**
 * photo: { date: 'YYYY-MM-DD', latitude, longitude }
 * Returns { target: '' | 'node:ID' | 'leg:ID' | 'stop:ID', reason: string }
 */
export function suggestPhotoTarget(photo, { nodes, legs, stops }) {
  const candidates = buildCandidates({ nodes, legs, stops });
  const lat = num(photo?.latitude), lon = num(photo?.longitude);
  const point = hasPoint(lat, lon) ? { lat, lon } : null;
  const date = photo?.date;
  const label = (c) => `${c.type}:${c.id}`;
  const km = (d) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);

  const sameDay = date ? candidates.filter(c => c.start && c.end && c.start <= date && date <= c.end) : [];

  if (sameDay.length) {
    if (point) {
      const best = closest(sameDay, point);
      if (best) {
        const shown = best.c.type === 'leg' ? best.d - LEG_PENALTY_KM : best.d;
        return { target: label(best.c), reason: `Closest item on ${date} (about ${km(Math.max(0, shown))} away)` };
      }
    }
    const first = [...sameDay].sort(bySpecificity)[0];
    return { target: label(first), reason: `First item on ${date}${point ? '' : ' (photo has no location)'}` };
  }

  if (point) {
    const best = closest(candidates, point);
    if (best) {
      const shown = best.c.type === 'leg' ? best.d - LEG_PENALTY_KM : best.d;
      return { target: label(best.c), reason: `Nothing dated ${date || 'that day'}; closest item (about ${km(Math.max(0, shown))} away)` };
    }
  }

  return { target: '', reason: 'No matching date or location; linking to the trip only' };
}
