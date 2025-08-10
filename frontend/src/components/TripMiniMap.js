import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSettings } from "../context/SettingsContext";
import { getTripColor, getTileLayerConfig, MapGlobalStyles, applyLeafletDefaultIconFix } from "../styles/mapTheme";

applyLeafletDefaultIconFix();

function FitToBounds({ bounds }) {
  const map = useMap();
  React.useEffect(() => {
    if (!bounds) return;
    try { map.fitBounds(bounds, { padding: [20, 20] }); } catch {}
  }, [map, bounds]);
  return null;
}

function quadraticBezierPoints(p0, p1, p2, steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    const y = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    pts.push([y, x]);
  }
  return pts;
}

function curvedFlightPath(start, end, curvature = 0.22) {
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
  return quadraticBezierPoints([lat1, lng1], [controlLat, controlLng], [lat2, lng2], 56);
}

export default function TripMiniMap({ tripID, nodes, legs, style }) {
  const { settings } = useSettings();
  const isDark = (settings?.theme || "dark") === "dark";

  const { markers, lines, bounds } = useMemo(() => {
    const m = [];
    const l = [];
    const latlngs = [];
    const nodeById = {};
    (nodes || []).forEach((n) => {
      nodeById[n.id] = n;
      if (isFinite(n.latitude) && isFinite(n.longitude)) {
        const pos = [n.latitude, n.longitude];
        m.push({ id: n.id, name: n.name, pos });
        latlngs.push(pos);
      }
    });
    const color = getTripColor(Number(tripID));
    (legs || []).forEach((leg) => {
      const start = [
        leg.start_latitude ?? nodeById[leg.start_node_id]?.latitude,
        leg.start_longitude ?? nodeById[leg.start_node_id]?.longitude,
      ];
      const end = [
        leg.end_latitude ?? nodeById[leg.end_node_id]?.latitude,
        leg.end_longitude ?? nodeById[leg.end_node_id]?.longitude,
      ];
      if (start.every(isFinite) && end.every(isFinite)) {
        const type = (leg.type || "").toLowerCase();
        if (type === "flight") {
          const curve = curvedFlightPath(start, end, 0.24);
          l.push({ positions: curve, color });
          latlngs.push(...curve);
        } else {
          l.push({ positions: [start, end], color });
          latlngs.push(start, end);
        }
      }
    });
    const b = latlngs.length ? L.latLngBounds(latlngs) : null;
    return { markers: m, lines: l, bounds: b };
  }, [nodes, legs, tripID]);

  return (
    <div style={{ height: 300, width: "100%", borderRadius: 12, overflow: "hidden", ...style }}>
      <MapContainer style={{ height: "100%", width: "100%" }} center={[20, 0]} zoom={2} scrollWheelZoom={false} doubleClickZoom={false} dragging keyboard zoomControl>
        <TileLayer {...getTileLayerConfig(isDark)} />
        {markers.map((m) => (
          <Marker key={m.id} position={m.pos}>
            <Tooltip direction="top" offset={[0, -20]} opacity={1} sticky>
              <span><strong>{m.name}</strong></span>
            </Tooltip>
          </Marker>
        ))}
        {lines.map((line, i) => (
          <Polyline key={i} positions={line.positions} pathOptions={{ color: line.color, weight: 3, opacity: 0.9 }} />
        ))}
        {bounds && <FitToBounds bounds={bounds} />}
      </MapContainer>
      <MapGlobalStyles />
    </div>
  );
}
