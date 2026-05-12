import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getTileLayerConfig, createAdventureDivIcon, applyLeafletDefaultIconFix } from '../../styles/mapTheme';
import styled, { useTheme } from 'styled-components';
import { Link } from 'react-router-dom';

applyLeafletDefaultIconFix();

const MapWrapper = styled.div`
  width: 100%;
  height: 320px;
  margin-bottom: 2rem;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.lg};
  overflow: hidden;
  box-shadow: ${p => p.theme.shadows.md};
`;

function FitBounds({ adventures }) {
  const map = useMap();
  useEffect(() => {
    if (!adventures || adventures.length === 0) return;
    const points = adventures.filter(a => a.latitude && a.longitude);
    if (points.length === 0) return;
    const bounds = points.map(p => [p.latitude, p.longitude]);
    try { map.fitBounds(bounds, { padding: [30, 30] }); } catch {}
  }, [adventures, map]);
  return null;
}

export default function AdventureInlineMap({ adventures }) {
  const theme = useTheme();
  const tile = getTileLayerConfig(theme.isDarkMode ? true : false);
  const first = adventures.find(a => a.latitude && a.longitude);
  const center = first ? [first.latitude, first.longitude] : [20, 0];
  return (
    <MapWrapper>
      <MapContainer center={center} zoom={3} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url={tile.url} attribution={tile.attribution} />
        <FitBounds adventures={adventures} />
        {adventures.filter(a => a.latitude && a.longitude).map(a => (
          <Marker key={a.id} position={[a.latitude, a.longitude]} icon={createAdventureDivIcon(a.category)}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{a.name}</strong><br />
                {a.start_date && <span>{a.start_date}</span>}
                {a.category && <div style={{ marginTop: 4 }}>{a.category}</div>}
                <div style={{ marginTop: 8 }}>
                  <Link to={`/adventures/view?adventureID=${a.id}`}>View adventure</Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </MapWrapper>
  );
}
