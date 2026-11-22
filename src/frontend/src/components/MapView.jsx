import React, { useState, useCallback } from "react";
import L from 'leaflet';
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, CircleMarker, Polyline, Popup, Tooltip, useMap, useMapEvent } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { applyLeafletDefaultIconFix, getTileLayerConfig, MapGlobalStyles, MapZoomClass, createNodeDivIcon, createStopDivIcon, createAdventureDivIcon, getTripColor } from "../styles/mapTheme";
import HighlightLayer from "./HighlightLayer";
import { FitToBounds } from "../utils/map_helper_functions";
import PhotoSlideshowLarge from "./photos/PhotoSlideshowLarge";
import { listPhotosByNode, listPhotosByStop } from "../api/photos";

import { useTheme } from "styled-components"
import { useSettings } from "../context/SettingsContext";

// Ensure marker icons load correctly
applyLeafletDefaultIconFix();

// Ensure the map cannot zoom out beyond the world's max bounds (dateline at edges)
function ClampToWorld() {
  const map = useMap();
  const update = React.useCallback(() => {
    try {
      const world = map.options.maxBounds;
      if (!world) return;
      const z = map.getBoundsZoom(world, false);
      if (Number.isFinite(z)) {
        map.setMinZoom(z);
        if (map.getZoom() < z) map.setZoom(z);
      }
    } catch {}
  }, [map]);

  useMapEvent('resize', update);
  React.useEffect(() => { update(); }, [update]);
  return null;
}

export default function MapView({
  markers = [],
  stopMarkers = [],
  adventureMarkers = [],
  placeMarkers = [], // [{ key, name, code?, pos, countLabel?, faded?, trips: [{id, name}] }]
  polylines = [], // [{ positions, color, tripId?, type?, opacity?, weight? }] (opacity/weight override the defaults)
  bounds,
  highlightMode = "off",
  nodeById = {},
  stopsByNodeId = {},
  visitedCountries,
  visitedStates,
  pathForTripId = (id) => `/trip/${id}`,
  linkLabel = "View trip",
  focusTripId = null,
}) {
  const { settings } = useSettings();
  const theme = useTheme();
  const isDark = (settings?.theme || "dark") === "dark";

  // Cache photos by entity so we only fetch once per popup
  const [nodePhotos, setNodePhotos] = useState({});
  const [stopPhotos, setStopPhotos] = useState({});
  const [adventurePhotos, setAdventurePhotos] = useState({});

  const loadNodePhotos = useCallback(async (nodeId) => {
    if (nodePhotos[nodeId]) return;
    try {
      const photos = await listPhotosByNode(nodeId);
      setNodePhotos((prev) => ({ ...prev, [nodeId]: (photos) }));
    } catch (_) {
      setNodePhotos((prev) => ({ ...prev, [nodeId]: [] }));
    }
  }, [nodePhotos]);

  const loadStopPhotos = useCallback(async (stopId) => {
    if (stopPhotos[stopId]) return;
    try {
      const photos = await listPhotosByStop(stopId);
      setStopPhotos((prev) => ({ ...prev, [stopId]: (photos) }));
    } catch (_) {
      setStopPhotos((prev) => ({ ...prev, [stopId]: [] }));
    }
  }, [stopPhotos]);

  const loadAdventurePhotos = useCallback(async (adventureId) => {
    if (adventurePhotos[adventureId]) return;
    try {
      const resp = await fetch(`/api/photos/by_adventure/${adventureId}`);
      if (resp.ok) {
        const photos = await resp.json();
        setAdventurePhotos(prev => ({ ...prev, [adventureId]: photos }));
      } else {
        setAdventurePhotos(prev => ({ ...prev, [adventureId]: [] }));
      }
    } catch {
      setAdventurePhotos(prev => ({ ...prev, [adventureId]: [] }));
    }
  }, [adventurePhotos]);

  // When a trip is focused, everything belonging to other trips (and adventures) fades
  const FADED = 0.15;
  const tripOpacity = (tripId) => (focusTripId && tripId !== focusTripId ? FADED : 1);
  const orderedPolylines = React.useMemo(() => {
    if (!focusTripId) return polylines;
    // Draw the focused trip last so it sits on top of the faded lines
    return [...polylines].sort((a, b) => (a.tripId === focusTripId) - (b.tripId === focusTripId));
  }, [polylines, focusTripId]);
  const linkStyle = { display: "inline-block", padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, color: theme.colors.text, fontSize: theme.fontSizes.xs, textDecoration: "none" };

  const [legendItems, setLegendItems] = useState([]); // {name, color}
  const [focusName, setFocusName] = useState(null);

  return (
    <div style={{ height: "100%", width: "100%", borderRadius: 12, overflow: "hidden", display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
      <MapContainer
        style={{ height: "100%", width: "100%" }}
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        worldCopyJump={false}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        zoomSnap={0.01}
        zoomDelta={0.01}
        wheelPxPerZoom={90}
      >
        <TileLayer key={isDark ? 'dark' : 'light'} {...getTileLayerConfig(isDark)} noWrap={true} />
        <ClampToWorld />
        <MapZoomClass />
        <HighlightLayer
          mode={highlightMode}
          visitedCountries={visitedCountries || new Set(Object.values(nodeById).map(n => n?.osm_country).filter(Boolean))}
          visitedStates={visitedStates || new Set(Object.values(nodeById).map(n => n?.osm_state).filter(Boolean))}
          styleColors={{ fill: theme.colors.accent || '#22c55e', stroke: theme.colors.accent || '#16a34a' }}
          onFeatureData={(items)=> setLegendItems(items)}
          focusFeature={focusName}
        />
        {focusTripId && (
          <FocusTrip tripId={focusTripId} markers={markers} />
        )}

        {markers.map((m) => (
          <Marker
            key={`node-${m.id}`}
            position={m.pos}
            icon={createNodeDivIcon(getTripColor(m.tripId))}
            zIndexOffset={1000}
            opacity={tripOpacity(m.tripId)}
            eventHandlers={{ popupopen: () => loadNodePhotos(m.id) }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false} sticky>
              <span>
                <strong>{m.name}</strong>
              </span>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 240 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.name}</div>
                <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary, marginBottom: 6 }}>
                  {nodeById[m.id]?.arrival_date || "?"} → {nodeById[m.id]?.departure_date || "?"}
                </div>
                {/* {nodeById[m.id]?.description && <div style={{ fontSize: theme.fontSizes.xs, marginBottom: 6 }}>{nodeById[m.id].description}</div>}
                {nodeById[m.id]?.notes && <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.textMuted, whiteSpace: "pre-wrap" }}>{nodeById[m.id].notes}</div>}
                {stopsByNodeId && (
                  <div style={{ marginTop: 6, fontSize: theme.fontSizes.xs }}>
                    Stops here: {(stopsByNodeId[m.id] || []).length}
                  </div>
                )} */}

                {/* Slideshow for node photos */}
                {(nodePhotos[m.id]?.length > 0) && (
                  <div style={{ marginTop: 10 }}>
                    <PhotoSlideshowLarge photos={nodePhotos[m.id]} image_height={160} />
                  </div>
                )}

                {typeof m.tripId !== 'undefined' && (
                  <div style={{ marginTop: 8 }}>
                    <Link
                      to={pathForTripId(m.tripId)}
                      style={{ display: "inline-block", padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.colors.border}` , background: theme.colors.surface, color: theme.colors.text, fontSize: theme.fontSizes.xs }}
                    >
                      {linkLabel}
                    </Link>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {stopMarkers.map((s) => (
          <Marker
            key={`stop-${s.id}`}
            position={s.pos}
            opacity={tripOpacity(s.tripId)}
            icon={createStopDivIcon(s.category, getTripColor(s.tripId))}
            eventHandlers={{ popupopen: () => loadStopPhotos(s.id) }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false} sticky>
              <span>
                <strong>{s.name}</strong>
                {s.category ? ` · ${s.category}` : ""}
              </span>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 240 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary, marginBottom: 6 }}>
                  {(s.visited && new Date(s.visited).toLocaleDateString()) || "Visited: Unknown"}
                  {s.category ? ` · ${s.category}` : ""}
                </div>
                {s.notes && <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.textMuted, whiteSpace: "pre-wrap" }}>{s.notes}</div>}

                {/* Slideshow for stop photos */}
                {(stopPhotos[s.id]?.length > 0) && (
                  <div style={{ marginTop: 10 }}>
                    <PhotoSlideshowLarge photos={stopPhotos[s.id]} image_height={160} />
                  </div>
                )}

                {typeof s.tripId !== 'undefined' && (
                  <div style={{ marginTop: 8 }}>
                    <Link
                      to={pathForTripId(s.tripId)}
                      style={{ display: "inline-block", padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.colors.border}` , background: theme.colors.surface, color: theme.colors.text, fontSize: theme.fontSizes.xs }}
                    >
                      {linkLabel}
                    </Link>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {adventureMarkers.map(a => (
          <Marker
            key={`adv-${a.id}`}
            position={a.pos}
            opacity={focusTripId ? FADED : 1}
            icon={createAdventureDivIcon(a.category)}
            eventHandlers={{ popupopen: () => loadAdventurePhotos(a.id) }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false} sticky>
              <span><strong>{a.name}</strong>{a.category ? ` · ${a.category}` : ''}</span>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight:700, marginBottom:4 }}>{a.name} {a.category && <span style={{ opacity:0.75 }}>· {a.category}</span>}</div>
                {(a.start_date || a.end_date) && (
                  <div style={{ fontSize: '0.65rem', color: '#777', marginBottom:6 }}>
                    {a.start_date && a.end_date && a.start_date !== a.end_date ? `${a.start_date} – ${a.end_date}` : (a.start_date || a.end_date)}
                  </div>
                )}
                {a.notes && <div style={{ fontSize: '0.65rem', color:'#666', whiteSpace:'pre-wrap', marginBottom:6 }}>{a.notes}</div>}
                {(adventurePhotos[a.id]?.length > 0) && (
                  <div style={{ marginTop: 6 }}>
                    <PhotoSlideshowLarge photos={adventurePhotos[a.id]} image_height={140} />
                  </div>
                )}
                <div style={{ marginTop:8 }}>
                  <Link
                    to={`/adventures/view?adventureID=${a.id}`}
                    style={{
                      display: 'inline-block',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: `1px solid ${theme.colors.border}`,
                      background: theme.colors.surface,
                      color: theme.colors.text,
                      fontSize: theme.fontSizes.xs,
                      textDecoration: 'none'
                    }}
                  >
                    View adventure
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {orderedPolylines.map((line, idx) => (
          <Polyline
            key={`leg-${idx}`}
            positions={line.positions}
            pathOptions={{
              color: line.color,
              weight: line.weight ?? 3,
              opacity: line.opacity ?? (focusTripId && line.tripId !== focusTripId ? 0.1 : 0.9),
              smoothFactor: 0,
            }}
          />
        ))}

        {placeMarkers.map((p) => (
          <CircleMarker
            key={`place-${p.key}`}
            center={p.pos}
            radius={6}
            pathOptions={p.faded
              ? { color: theme.colors.background || '#000', weight: 1, opacity: 0.4, fillColor: theme.colors.textMuted || '#94a3b8', fillOpacity: 0.3 }
              : { color: theme.colors.background || '#000', weight: 1.5, opacity: 1, fillColor: theme.colors.accent || '#f59e0b', fillOpacity: 0.95 }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} sticky>
              <span><strong>{p.code ? `${p.code}` : p.name}</strong>{p.code && p.name && p.name !== p.code ? ` · ${p.name}` : ""}{p.faded ? " · not visited" : ""}</span>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {p.code && <span style={{ marginRight: 6 }}>{p.code}</span>}
                  {p.name && p.name !== p.code ? p.name : ""}
                </div>
                {p.countLabel && (
                  <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary, marginBottom: 6 }}>{p.countLabel}</div>
                )}
                {(p.trips || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {p.trips.map((t) => (
                      <Link key={t.id} to={pathForTripId(t.id)} style={linkStyle}>{t.name}</Link>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

  {bounds && !focusTripId && <FitToBounds bounds={bounds} />}
      </MapContainer>
      <MapGlobalStyles />
      </div>
      {/* Legend for highlighted regions */}
      {highlightMode !== 'off' && legendItems.length > 0 && (
        <div style={{ maxHeight: 140, overflowY: 'auto', padding: '6px 8px', background: theme.colors.surfaceAlt || theme.colors.surface, borderTop: `1px solid ${theme.colors.border}`, fontSize: theme.fontSizes.xs, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {legendItems.map(item => (
            <button
              key={item.name}
              onClick={() => setFocusName(item.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: `1px solid ${theme.colors.border}`,
                padding: '2px 6px',
                borderRadius: 4,
                cursor: 'pointer',
                color: theme.colors.text,
                fontSize: 'inherit',
                opacity: focusName && focusName !== item.name ? 0.6 : 1,
                transition: 'opacity 0.15s'
              }}
              title={`Focus ${item.name}`}
            >
              <span style={{ width: 12, height: 12, background: item.color, borderRadius: 2, border: '1px solid rgba(0,0,0,0.2)' }} />
              <span style={{ whiteSpace: 'nowrap' }}>{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Focus map on all markers belonging to a tripId
function FocusTrip({ tripId, markers }) {
  const map = useMap();
  React.useEffect(() => {
    if (!tripId) return;
    const pts = markers.filter(m => m.tripId === tripId).map(m => m.pos).filter(Boolean);
    if (!pts.length) return;
    try {
      if (pts.length === 1) {
        map.flyTo(pts[0], Math.max(map.getZoom(), 6), { animate: true });
      } else {
        const b = L.latLngBounds(pts);
        map.fitBounds(b.pad(0.1), { animate: true });
      }
    } catch {}
  }, [tripId, markers, map]);
  return null;
}
