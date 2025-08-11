import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../components/page-components";
import { Text, Flex, Badge } from "../styles/components";
import { getTrip } from "../api/trips";
import { listNodesByTrip } from "../api/nodes";
import { listStopsByTrip } from "../api/stops";
import { listLegsByTrip, getCarDetails } from "../api/legs";
import { useSettings } from "../context/SettingsContext";
import { useTheme } from "styled-components";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import polylineCodec from "@mapbox/polyline";
import { applyLeafletDefaultIconFix, getTileLayerConfig, getTripColor, MapGlobalStyles, createStopDivIcon } from "../styles/mapTheme";
import HighlightLayer from "../components/HighlightLayer";

applyLeafletDefaultIconFix();

function quadraticBezierPoints(p0, p1, p2, steps = 64) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    const y = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    pts.push([y, x]);
  }
  return pts;
}

function curvedFlightPath(start, end, curvature = 0.2) {
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -(dy / len);
  const ny = dx / len;
  const controlLat = midLat + ny * len * curvature;
  const controlLng = midLng + nx * len * curvature;
  return quadraticBezierPoints([lat1, lng1], [controlLat, controlLng], [lat2, lng2], 72);
}

function FitToBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    try {
      map.fitBounds(bounds, { padding: [30, 30] });
    } catch {}
  }, [map, bounds]);
  return null;
}

function TripMap() {
  const { tripID } = useParams();
  const { settings } = useSettings();
  const theme = useTheme();
  const isDark = (settings?.theme || "dark") === "dark";

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [legs, setLegs] = useState([]);
  const [stops, setStops] = useState([]);
  const [carPolylineByLeg, setCarPolylineByLeg] = useState({});
  const [highlightMode, setHighlightMode] = useState("off"); // off | countries | states

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [t, n, l, s] = await Promise.all([
          getTrip(tripID),
          listNodesByTrip(tripID),
          listLegsByTrip(tripID),
          listStopsByTrip(tripID),
        ]);
        if (cancelled) return;
        setTrip(t);
        setNodes(n);
        setLegs(l);
        setStops(s);

        const carLegs = (l || []).filter((leg) => (leg.type || "").toLowerCase() === "car");
        const pairs = await Promise.all(
          carLegs.map(async (leg) => {
            try {
              const details = await getCarDetails(leg.id);
              return [leg.id, details?.polyline || null];
            } catch {
              return [leg.id, null];
            }
          })
        );
        if (cancelled) return;
        setCarPolylineByLeg(Object.fromEntries(pairs));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to load trip map", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tripID]);

  const { markers, stopMarkers, polylines, bounds, nodeById, visitedCountries, visitedStates } = useMemo(() => {
    const allMarkers = [];
    const allStopMarkers = [];
    const allLines = [];
    const latlngsForBounds = [];
    const visitedCountries = new Set();
    const visitedStates = new Set();

    const nodeById = {};
    (nodes || []).forEach((n) => {
      nodeById[n.id] = n;
      if (isFinite(n.latitude) && isFinite(n.longitude)) {
        allMarkers.push({ id: n.id, name: n.name, pos: [n.latitude, n.longitude] });
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
        allStopMarkers.push({ id: s.id, name: s.name, category: s.category, pos: [s.latitude, s.longitude], visited, notes: s.notes });
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
        const encoded = carPolylineByLeg[leg.id];
        if (encoded) {
          try {
            const decoded = polylineCodec.decode(encoded).map(([lat, lng]) => [lat, lng]);
            if (decoded.length >= 2) {
              allLines.push({ positions: decoded, color, type });
              decoded.forEach((p) => latlngsForBounds.push(p));
              return;
            }
          } catch {}
        }
        allLines.push({ positions: [start, end], color, type });
        latlngsForBounds.push(start, end);
      } else if (type === "flight") {
        const curve = curvedFlightPath(start, end, 0.25);
        allLines.push({ positions: curve, color, type });
        latlngsForBounds.push(...curve);
      } else {
        allLines.push({ positions: [start, end], color, type });
        latlngsForBounds.push(start, end);
      }
    });

    const mapBounds = latlngsForBounds.length ? L.latLngBounds(latlngsForBounds) : L.latLngBounds([[20, 0], [50, 30]]);
  return { markers: allMarkers, stopMarkers: allStopMarkers, polylines: allLines, bounds: mapBounds, nodeById, visitedCountries, visitedStates };
  }, [nodes, legs, stops, carPolylineByLeg, tripID]);

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="center">
          <h1>{trip ? trip.name : "Trip Map"}</h1>
          <Text variant="muted">{loading ? "Loading…" : `${markers.length} places, ${polylines.length} legs`}</Text>
        </Flex>
      </PageHeader>

      <div style={{ height: "70vh", width: "100%", borderRadius: 12, overflow: "hidden" }}>
        <MapContainer style={{ height: "100%", width: "100%" }} center={[20, 0]} zoom={2} scrollWheelZoom>
          <TileLayer {...getTileLayerConfig(isDark)} />
          <HighlightLayer
            mode={highlightMode}
            visitedCountries={visitedCountries}
            visitedStates={visitedStates}
            styleColors={{ fill: theme.colors.accent || '#22c55e', stroke: theme.colors.accent || '#16a34a' }}
          />

          {markers.map((m) => (
            <Marker key={`node-${m.id}`} position={m.pos}>
              <Tooltip direction="top" offset={[0, -24]} opacity={1} permanent={false} sticky>
                <span>
                  <strong>{m.name}</strong>
                </span>
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>
                    {nodeById[m.id]?.arrival_date || "?"} → {nodeById[m.id]?.departure_date || "?"}
                  </div>
                  {nodeById[m.id]?.description && <div style={{ fontSize: 12, marginBottom: 6 }}>{nodeById[m.id].description}</div>}
                  {nodeById[m.id]?.notes && <div style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "pre-wrap" }}>{nodeById[m.id].notes}</div>}
                  <div style={{ marginTop: 8 }}>
                    <Link
                      to={`/trip/${tripID}`}
                      style={{ display: "inline-block", padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, color: theme.colors.text, fontSize: 12 }}
                    >
                      View trip details
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {stopMarkers.map((s) => (
            <Marker key={`stop-${s.id}`} position={s.pos} icon={createStopDivIcon(s.category, getTripColor(Number(tripID)))}>
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false} sticky>
                <span>
                  <strong>{s.name}</strong>
                  {s.category ? ` · ${s.category}` : ""}
                </span>
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>
                    {(s.visited && new Date(s.visited).toLocaleDateString()) || "Visited: Unknown"}
                    {s.category ? ` · ${s.category}` : ""}
                  </div>
                  {s.notes && <div style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "pre-wrap" }}>{s.notes}</div>}
                  <div style={{ marginTop: 8 }}>
                    <Link
                      to={`/trip/${tripID}`}
                      style={{ display: "inline-block", padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, color: theme.colors.text, fontSize: 12 }}
                    >
                      View trip details
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {polylines.map((line, idx) => (
            <Polyline key={`leg-${idx}`} positions={line.positions} pathOptions={{ color: line.color, weight: 3, opacity: 0.9 }} />
          ))}

          {bounds && <FitToBounds bounds={bounds} />}
        </MapContainer>
      </div>

      <MapGlobalStyles />
      <Flex gap={2} style={{ marginTop: 8, alignItems: "center" }}>
        <Text variant="muted">Highlight:</Text>
        <button onClick={() => setHighlightMode("off")} disabled={highlightMode === "off"}>Off</button>
        <button onClick={() => setHighlightMode("countries")} disabled={highlightMode === "countries"}>Countries</button>
        <button onClick={() => setHighlightMode("states")} disabled={highlightMode === "states"}>States</button>
      </Flex>

      <Flex gap={2} style={{ marginTop: 12, flexWrap: "wrap" }}>
        {trip && (
          <Flex align="center" gap={2}>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 9999, background: getTripColor(Number(tripID)) }} />
            <Badge variant="outline">{trip.name}</Badge>
          </Flex>
        )}
      </Flex>
    </div>
  );
}

export default TripMap;
