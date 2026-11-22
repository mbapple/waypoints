// Turns a trip's nodes, legs, stops and photos into a day-by-day itinerary.
//
// Each day gets:
//   legGroups – legs that day, chained through invisible nodes into one group per visible-node hop
//              (Austin → DFW → Denver becomes one "Austin → Denver via DFW" group)
//   stops     – stops that day (everything except lodging)
//   lodging   – lodging stops (hotel / hostel / campground …) for that night
//   nodes     – the visible nodes you are at that day
// Anything that can't be placed on a day of the trip ends up in `unscheduled`.
//
// Dates are plain 'YYYY-MM-DD' strings throughout, so string comparison orders them.

// Stop categories treated as somewhere you stay overnight (matched case-insensitively,
// also as a word inside a longer category such as "Boutique hotel").
const LODGING_WORDS = [
  'hotel', 'motel', 'hostel', 'inn', 'lodge', 'lodging', 'accommodation', 'resort', 'airbnb',
  'bnb', 'b&b', 'guesthouse', 'guest house', 'cabin', 'campground', 'campsite', 'camping',
  'camp', 'rv park', 'glamping', 'stay', 'apartment', 'villa', 'hut', 'refuge',
];

export function isLodging(stop) {
  const cat = String(stop?.category || '').toLowerCase().trim();
  if (!cat) return false;
  return LODGING_WORDS.some((w) => cat === w || new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')}s?($|[^a-z])`).test(cat));
}

const DAY_MS = 86400000;

export function dateRange(start, end) {
  const out = [];
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (isNaN(s) || isNaN(e) || e < s) return out;
  for (let t = s.getTime(); t <= e.getTime(); t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

const addDays = (date, n) => new Date(new Date(`${date}T00:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);

// Inclusive date span a node covers; a missing end means a single day.
function nodeSpan(n) {
  const a = n.arrival_date || n.departure_date;
  const d = n.departure_date || n.arrival_date;
  return a ? [a, d < a ? a : d] : null;
}

// Days a non-lodging stop shows up on.
function stopDays(stop, nodeById, legById) {
  if (stop.start_date || stop.end_date) {
    const s = stop.start_date || stop.end_date;
    const e = stop.end_date || stop.start_date;
    return e > s ? dateRange(s, e) : [s];
  }
  // Undated: first day of its node, or the date of its leg
  if (stop.node_id && nodeById.has(stop.node_id)) {
    const span = nodeSpan(nodeById.get(stop.node_id));
    return span ? [span[0]] : [];
  }
  if (stop.leg_id && legById.get(stop.leg_id)?.date) return [legById.get(stop.leg_id).date];
  return [];
}

// Nights a lodging stop covers: check-in night through the night before check-out.
function lodgingNights(stop, nodeById) {
  let s = stop.start_date;
  let e = stop.end_date;
  if (!s && stop.node_id && nodeById.has(stop.node_id)) {
    const span = nodeSpan(nodeById.get(stop.node_id));
    if (span) { s = span[0]; e = e || span[1]; }
  }
  if (!s) return [];
  if (!e || e <= s) return [s];
  return dateRange(s, addDays(e, -1));
}

// Chain one day's legs into groups between visible nodes.
function buildLegGroups(dayLegs, nodeById) {
  const remaining = [...dayLegs].sort((a, b) => a.id - b.id);
  const endIds = new Set(remaining.map((l) => l.end_node_id));
  const segments = [];
  const take = (leg) => remaining.splice(remaining.indexOf(leg), 1);
  while (remaining.length) {
    // Prefer starting from a leg whose origin isn't reached by another leg today
    const first = remaining.find((l) => !endIds.has(l.start_node_id) || !nodeById.get(l.start_node_id)?.invisible) || remaining[0];
    take(first);
    const legs = [first];
    let cur = first;
    let guard = 0;
    while (guard++ < 50) {
      const endNode = nodeById.get(cur.end_node_id);
      if (!endNode || !endNode.invisible) break;
      const next = remaining.find((l) => l.start_node_id === endNode.id);
      if (!next) break;
      take(next);
      legs.push(next);
      cur = next;
    }
    const from = nodeById.get(legs[0].start_node_id) || null;
    const to = nodeById.get(legs[legs.length - 1].end_node_id) || null;
    const via = legs.slice(0, -1).map((l) => nodeById.get(l.end_node_id)).filter(Boolean);
    const miles = legs.reduce((sum, l) => sum + (Number(l.miles) || 0), 0);
    segments.push({ key: legs.map((l) => l.id).join('-'), legs, from, to, via, miles, types: [...new Set(legs.map((l) => (l.type || '').toLowerCase()))] });
  }
  return segments;
}

export function photosByEntity(photos = []) {
  const map = { stop: new Map(), node: new Map(), leg: new Map() };
  for (const p of photos) {
    for (const [type, field] of [['stop', 'stop_id'], ['node', 'node_id'], ['leg', 'leg_id']]) {
      const id = p[field];
      if (id == null) continue;
      if (!map[type].has(id)) map[type].set(id, []);
      map[type].get(id).push(p);
    }
  }
  return map;
}

export function buildItinerary({ trip, nodes = [], legs = [], stops = [] }) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const legById = new Map(legs.map((l) => [l.id, l]));

  // Trip days: the trip's own range, widened to cover any dated item that falls outside it
  const allDates = [
    trip?.start_date, trip?.end_date,
    ...nodes.flatMap((n) => [n.arrival_date, n.departure_date]),
    ...legs.map((l) => l.date),
  ].filter(Boolean).sort();
  const start = trip?.start_date || allDates[0];
  const end = trip?.end_date || allDates[allDates.length - 1];
  const dates = start && end ? dateRange(start <= allDates[0] ? start : allDates[0], end >= allDates[allDates.length - 1] ? end : allDates[allDates.length - 1]) : [];
  const dayIndex = new Map(dates.map((d, i) => [d, i]));

  const days = dates.map((date, i) => ({
    date, dayNumber: i + 1, totalDays: dates.length,
    legGroups: [], stops: [], lodging: [], nodes: [],
  }));
  const unscheduled = { stops: [], legGroups: [], nodes: [] };

  // Legs
  const legsByDate = new Map();
  for (const l of legs) {
    if (l.date && dayIndex.has(l.date)) {
      if (!legsByDate.has(l.date)) legsByDate.set(l.date, []);
      legsByDate.get(l.date).push(l);
    }
  }
  for (const [date, dayLegs] of legsByDate) days[dayIndex.get(date)].legGroups = buildLegGroups(dayLegs, nodeById);
  const undatedLegs = legs.filter((l) => !l.date || !dayIndex.has(l.date));
  if (undatedLegs.length) unscheduled.legGroups = buildLegGroups(undatedLegs, nodeById);

  // Visible nodes present each day
  for (const n of nodes) {
    if (n.invisible) continue;
    const span = nodeSpan(n);
    const covered = span ? dateRange(span[0], span[1]).filter((d) => dayIndex.has(d)) : [];
    if (!covered.length) { unscheduled.nodes.push(n); continue; }
    for (const d of covered) days[dayIndex.get(d)].nodes.push(n);
  }

  // Stops and lodging
  for (const s of stops) {
    if (isLodging(s)) {
      const nights = lodgingNights(s, nodeById).filter((d) => dayIndex.has(d));
      if (!nights.length) { unscheduled.stops.push(s); continue; }
      const checkOut = s.end_date && s.end_date > (s.start_date || '') ? s.end_date : null;
      nights.forEach((d, idx) => {
        days[dayIndex.get(d)].lodging.push({ stop: s, night: idx + 1, nights: nights.length, checkIn: idx === 0, checkOut });
      });
      continue;
    }
    const ds = stopDays(s, nodeById, legById).filter((d) => dayIndex.has(d));
    if (!ds.length) { unscheduled.stops.push(s); continue; }
    for (const d of ds) days[dayIndex.get(d)].stops.push(s);
  }

  const byStart = (a, b) => (a.start_date || '').localeCompare(b.start_date || '') || a.id - b.id;
  for (const day of days) {
    day.stops.sort(byStart);
    day.nodes.sort((a, b) => (nodeSpan(a)?.[0] || '').localeCompare(nodeSpan(b)?.[0] || '') || a.id - b.id);
    day.itemCount = day.stops.length + day.lodging.filter((l) => l.checkIn).length + day.legGroups.length;
  }
  return { days, unscheduled };
}

// ---- Date formatting (dates are calendar dates, so format in UTC to avoid TZ shifts) ----
const fmt = (date, opts) => new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC', ...opts });
export const fmtDayParts = (d) => ({ weekday: fmt(d, { weekday: 'short' }), day: fmt(d, { day: 'numeric' }), month: fmt(d, { month: 'short' }) });
export const fmtLong = (d) => fmt(d, { month: 'long', day: 'numeric', year: 'numeric' });
export const fmtShort = (d) => fmt(d, { month: 'short', day: 'numeric' });
export function fmtTripRange(a, b) {
  if (!a) return '';
  if (!b || a === b) return fmtLong(a);
  const year = (d) => d.slice(0, 4);
  const dayNum = (d) => String(Number(d.slice(8, 10)));
  if (year(a) !== year(b)) return `${fmtShort(a)}, ${year(a)} – ${fmtShort(b)}, ${year(b)}`;
  if (a.slice(5, 7) === b.slice(5, 7)) return `${fmtShort(a)} – ${dayNum(b)}, ${year(b)}`;
  return `${fmtShort(a)} – ${fmtShort(b)}, ${year(b)}`;
}
export function fmtSpan(a, b) {
  if (!a && !b) return '';
  if (!a || !b || a === b) return fmtShort(a || b);
  return `${fmtShort(a)} – ${fmtShort(b)}`;
}
