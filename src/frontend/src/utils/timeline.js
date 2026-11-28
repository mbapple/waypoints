// Map Timeline view: every node, stop, leg and adventure as one chronologically ordered list
// of "features", plus helpers to turn a slice of that list back into MapView layers.
//
// Dates are calendar dates only (no times), so order within a day comes from the trip's
// structure: legs run from their start node to their end node, and stops sit at a node or on a leg.

import { nodeSpan, stopDays, photosByEntity } from "./itinerary";

export const DAY_MS = 86400000;

// 'YYYY-MM-DD' (or a longer ISO string) -> UTC midnight in ms, or null
export function dateToMs(date) {
  if (!date) return null;
  const t = Date.parse(`${String(date).slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) ? t : null;
}

const KIND_ORDER = { node: 0, stop: 1, leg: 2, adventure: 3 };

// Order one trip's nodes: by first date, and among nodes sharing a date follow the
// leg chains (a leg's start node comes before its end node), falling back to API order.
// -> Map(nodeId -> rank)
function rankNodes(nodes, legs, tripStart) {
  const dateOf = (n) => nodeSpan(n)?.[0] || tripStart || null;
  const apiIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const groups = new Map(); // date -> [node]
  nodes.forEach((n) => {
    const d = dateOf(n) || "~"; // undated nodes sort last
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d).push(n);
  });

  const ordered = [];
  [...groups.keys()].sort().forEach((d) => {
    const group = groups.get(d);
    const ids = new Set(group.map((n) => n.id));
    const indeg = new Map(group.map((n) => [n.id, 0]));
    const out = new Map(group.map((n) => [n.id, []]));
    // Only legs traveled that day constrain it (a round trip's return leg would otherwise form a cycle)
    legs.forEach((l) => {
      if (l.date && String(l.date).slice(0, 10) !== d) return;
      if (ids.has(l.start_node_id) && ids.has(l.end_node_id) && l.start_node_id !== l.end_node_id) {
        out.get(l.start_node_id).push(l.end_node_id);
        indeg.set(l.end_node_id, indeg.get(l.end_node_id) + 1);
      }
    });
    // Kahn's algorithm; ties (and cycles) resolved by API order
    const remaining = [...group].sort((a, b) => apiIndex.get(a.id) - apiIndex.get(b.id));
    while (remaining.length) {
      let idx = remaining.findIndex((n) => indeg.get(n.id) === 0);
      if (idx < 0) idx = 0; // cycle: break it at the earliest node
      const [n] = remaining.splice(idx, 1);
      ordered.push(n);
      out.get(n.id).forEach((to) => indeg.set(to, indeg.get(to) - 1));
    }
  });
  return new Map(ordered.map((n, i) => [n.id, i]));
}

// layers = buildMapLayersForAllTrips(...) output; geometry is taken from it so it's built once.
// -> { features (sorted), undatedCount }
export function buildTimelineFeatures({ trips = [], nodesByTrip = {}, legsByTrip = {}, stopsByTrip = {}, layers }) {
  const features = [];
  let undatedCount = 0;
  if (!layers) return { features, undatedCount };

  const tripById = new Map((trips || []).map((t) => [Number(t.id), t]));
  const markerById = new Map(layers.markers.map((m) => [m.id, m]));
  const stopMarkerById = new Map(layers.stopMarkers.map((s) => [s.id, s]));
  const linesByLeg = new Map();
  layers.polylines.forEach((p) => {
    if (p.legId == null) return;
    if (!linesByLeg.has(p.legId)) linesByLeg.set(p.legId, []);
    linesByLeg.get(p.legId).push(p);
  });

  const push = (f) => {
    const t = dateToMs(f.date);
    if (t == null) { undatedCount += 1; return; }
    features.push({ ...f, t });
  };

  const tripIds = new Set([...Object.keys(nodesByTrip), ...Object.keys(legsByTrip), ...Object.keys(stopsByTrip)].map(Number));
  tripIds.forEach((tripId) => {
    const nodes = nodesByTrip[tripId] || [];
    const legs = legsByTrip[tripId] || [];
    const stops = stopsByTrip[tripId] || [];
    const trip = tripById.get(tripId);
    const tripStart = trip?.start_date || null;
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const legById = new Map(legs.map((l) => [l.id, l]));
    const nodeRank = rankNodes(nodes, legs, tripStart);
    const BIG = 1e6;

    const legRank = (l) => {
      if (nodeRank.has(l.start_node_id)) return 2 * nodeRank.get(l.start_node_id) + 1;
      if (nodeRank.has(l.end_node_id)) return 2 * nodeRank.get(l.end_node_id) - 1;
      return BIG;
    };

    nodes.forEach((n) => {
      const marker = markerById.get(n.id);
      if (!marker) return; // invisible or no coordinates
      push({ key: `node-${n.id}`, kind: "node", id: n.id, name: n.name, tripId, tripStart, rank: 2 * nodeRank.get(n.id), date: nodeSpan(n)?.[0] || tripStart, marker });
    });

    legs.forEach((l) => {
      const lines = linesByLeg.get(l.id);
      if (!lines?.length) return; // no endpoints
      const polylines = lines.map((p, i) => ({ ...p, key: `leg-${l.id}-${i}` }));
      const end = (id, osmName) => nodeById.get(id)?.name || osmName || "?";
      const name = `${end(l.start_node_id, l.start_osm_name)} → ${end(l.end_node_id, l.end_osm_name)}`;
      push({ key: `leg-${l.id}`, kind: "leg", id: l.id, name, tripId, tripStart, rank: legRank(l), date: l.date, polylines });
    });

    stops.forEach((s) => {
      const marker = stopMarkerById.get(s.id);
      if (!marker) return; // no coordinates
      let rank = BIG;
      if (s.node_id && nodeRank.has(s.node_id)) rank = 2 * nodeRank.get(s.node_id) + 0.5;
      else if (s.leg_id && legById.has(s.leg_id)) rank = legRank(legById.get(s.leg_id)) + 0.5;
      push({ key: `stop-${s.id}`, kind: "stop", id: s.id, name: s.name, tripId, tripStart, rank, date: stopDays(s, nodeById, legById)[0], marker });
    });
  });

  (layers.adventureMarkers || []).forEach((a) => {
    push({ key: `adv-${a.id}`, kind: "adventure", id: a.id, name: a.name, tripId: null, tripStart: null, rank: 0, date: a.start_date || a.end_date, marker: a });
  });

  features.sort((a, b) =>
    a.t - b.t
    || String(a.tripStart || a.date).localeCompare(String(b.tripStart || b.date))
    || (a.tripId ?? 0) - (b.tripId ?? 0)
    || a.rank - b.rank
    || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    || a.id - b.id);
  return { features, undatedCount };
}

// Cut a multi-segment path ([[lat, lng], ...][]) at `frac` of its total length,
// interpolating the final point so even 2-point legs grow smoothly.
export function slicePolyline(segments, frac) {
  if (frac >= 1) return segments;
  if (frac <= 0) return [];
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const total = segments.reduce((sum, seg) => sum + seg.slice(1).reduce((s, p, i) => s + dist(seg[i], p), 0), 0);
  let left = total * frac;
  const out = [];
  for (const seg of segments) {
    const part = [seg[0]];
    for (let i = 1; i < seg.length; i += 1) {
      const d = dist(seg[i - 1], seg[i]);
      if (d >= left) {
        const k = d > 0 ? left / d : 0;
        part.push([seg[i - 1][0] + (seg[i][0] - seg[i - 1][0]) * k, seg[i - 1][1] + (seg[i][1] - seg[i - 1][1]) * k]);
        out.push(part);
        return out;
      }
      left -= d;
      part.push(seg[i]);
    }
    out.push(part);
  }
  return out;
}

// Features -> MapView layers. `partial` = { feature, frac } draws one more feature part-way
// (a leg grows along its path with a dot at its tip, so a return leg drawn over the
// outbound one is still visible; a marker simply appears).
export function layersFromFeatures(features, partial = null) {
  const markers = [];
  const stopMarkers = [];
  const adventureMarkers = [];
  const polylines = [];
  const heads = [];
  const add = (f, frac = 1) => {
    if (f.kind === "node") markers.push(f.marker);
    else if (f.kind === "stop") stopMarkers.push(f.marker);
    else if (f.kind === "adventure") adventureMarkers.push(f.marker);
    else if (f.kind === "leg") {
      if (frac >= 1) { polylines.push(...f.polylines); return; }
      const cut = slicePolyline(f.polylines.map((p) => p.positions), frac);
      cut.forEach((positions, i) => { if (positions.length >= 2) polylines.push({ ...f.polylines[i], positions }); });
      const tip = cut[cut.length - 1]?.[cut[cut.length - 1].length - 1];
      if (tip) heads.push({ key: `head-${f.id}`, pos: tip, color: f.polylines[0]?.color, tripId: f.tripId });
    }
  };
  features.forEach((f) => add(f));
  if (partial?.feature) add(partial.feature, partial.frac);
  return { markers, stopMarkers, adventureMarkers, polylines, heads };
}

// ---- Photos during playback ----
// When a node, stop or leg is drawn, a card with its newest PHOTOS_PER_FEATURE photos pops up
// on the map and fades out PHOTO_SECONDS later; at most MAX_PHOTO_CARDS are shown at once.
export const PHOTOS_PER_FEATURE = 2;
export const PHOTO_SECONDS = 3;
export const MAX_PHOTO_CARDS = 3;

// Small image for the map card: Immich's thumbnail size via the backend proxy, else the upload itself
export function photoThumbUrl(photo) {
  return photo.immich_asset_id ? `/api/integrations/immich/assets/${photo.immich_asset_id}/thumbnail` : photo.url;
}

// photosByTrip = { tripId: GET /photos/by_trip/{id} rows } (newest first)
// -> { byIndex: Map(featureIndex -> card), indices: ascending feature indices that have a card }
export function buildPhotoCards(features, photosByTrip, trips = []) {
  const byIndex = new Map();
  const indices = [];
  if (!photosByTrip) return { byIndex, indices };
  const tripName = new Map((trips || []).map((t) => [Number(t.id), t.name]));
  const entities = photosByEntity(Object.values(photosByTrip).flat());
  features.forEach((f, i) => {
    if (f.kind !== "node" && f.kind !== "stop" && f.kind !== "leg") return;
    const photos = (entities[f.kind].get(f.id) || []).slice(0, PHOTOS_PER_FEATURE);
    if (!photos.length) return;
    let pos = f.marker?.pos;
    if (f.kind === "leg") { // halfway along the route
      const half = slicePolyline(f.polylines.map((p) => p.positions), 0.5);
      const last = half[half.length - 1];
      pos = last?.[last.length - 1];
    }
    if (!pos) return;
    byIndex.set(i, {
      key: `photo-${f.key}`,
      pos,
      title: f.name || "",
      date: f.date,
      tripId: f.tripId,
      tripName: tripName.get(f.tripId) || "Trip",
      photos: photos.map((p) => ({ ...p, thumb: photoThumbUrl(p) })),
    });
    indices.push(i);
  });
  return { byIndex, indices };
}

// Cards to show at playback position `playPos` (float feature index; playback began at `playStart`).
// Newest first, each with an `opacity` that fades over the last quarter of its time on screen.
export function recentPhotoCards({ byIndex, indices }, playPos, playStart, speed) {
  if (playPos == null || !indices.length) return [];
  const life = PHOTO_SECONDS * speed; // in steps, so cards stay up for the same time at any speed
  const cur = Math.floor(playPos);
  let j = indices.length - 1;
  while (j >= 0 && indices[j] > cur) j -= 1;
  const out = [];
  for (; j >= 0 && out.length < MAX_PHOTO_CARDS; j -= 1) {
    const i = indices[j];
    if (i < playStart) break;
    const age = playPos - i;
    if (age > life) break;
    out.push({ ...byIndex.get(i), opacity: Math.min(1, (life - age) / (life * 0.25)), order: out.length });
  }
  return out;
}

// The next few cards after `playPos`, so their thumbnails can be preloaded before they pop up
export function upcomingPhotoCards({ byIndex, indices }, playPos, count = 4) {
  const cur = Math.floor(playPos ?? -1);
  return indices.filter((i) => i > cur).slice(0, count).map((i) => byIndex.get(i));
}
