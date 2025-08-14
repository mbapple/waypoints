import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { applyLeafletDefaultIconFix, getTileLayerConfig, MapGlobalStyles, createStopDivIcon, getTripColor } from "../styles/mapTheme";
import HighlightLayer from "./HighlightLayer";
import { FitToBounds } from "../utils/map_helper_functions";
import PhotoSlideshowLarge from "./photos/PhotoSlideshowLarge";
import { listPhotosByNode, listPhotosByStop } from "../api/photos";

// Ensure marker icons load correctly
applyLeafletDefaultIconFix();


export default function MapView({
  isDark,
  theme,
  markers = [],
  stopMarkers = [],
  polylines = [],
  bounds,
  highlightMode = "off",
  nodeById = {},
  stopsByNodeId = {},
  visitedCountries,
  visitedStates,
  pathForTripId = (id) => `/trip/${id}`,
  linkLabel = "View trip",
}) {
  // Cache photos by entity so we only fetch once per popup
  const [nodePhotos, setNodePhotos] = useState({});
  const [stopPhotos, setStopPhotos] = useState({});

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

  return (
    <div style={{ height: "70vh", width: "100%", borderRadius: 12, overflow: "hidden" }}>
      <MapContainer style={{ height: "100%", width: "100%" }} center={[20, 0]} zoom={2} scrollWheelZoom>
        <TileLayer {...getTileLayerConfig(isDark)} />
        <HighlightLayer
          mode={highlightMode}
          visitedCountries={visitedCountries || new Set(Object.values(nodeById).map(n => n?.osm_country).filter(Boolean))}
          visitedStates={visitedStates || new Set(Object.values(nodeById).map(n => n?.osm_state).filter(Boolean))}
          styleColors={{ fill: theme.colors.accent || '#22c55e', stroke: theme.colors.accent || '#16a34a' }}
        />

        {markers.map((m) => (
          <Marker
            key={`node-${m.id}`}
            position={m.pos}
            eventHandlers={{ popupopen: () => loadNodePhotos(m.id) }}
          >
            <Tooltip direction="top" offset={[0, -24]} opacity={1} permanent={false} sticky>
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
            icon={createStopDivIcon(s.category, getTripColor(s.tripId))}
            eventHandlers={{ popupopen: () => loadStopPhotos(s.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false} sticky>
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

        {polylines.map((line, idx) => (
          <Polyline key={`leg-${idx}`} positions={line.positions} pathOptions={{ color: line.color, weight: 3, opacity: 0.9 }} />
        ))}

        {bounds && <FitToBounds bounds={bounds} />}
      </MapContainer>
      <MapGlobalStyles />
    </div>
  );
}
