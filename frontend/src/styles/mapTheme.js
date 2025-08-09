import L from 'leaflet';
import { createGlobalStyle } from 'styled-components';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Ensure Leaflet default marker icons work under bundlers like CRA/Vite
export function applyLeafletDefaultIconFix() {
  try {
    L.Marker.prototype.options.icon = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41],
    });
  } catch {}
}

// Return a tile layer config matching the current theme
export function getTileLayerConfig(isDark) {
  if (isDark) {
    return {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    };
  }
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };
}

// Consistent per-trip color generator
export function getTripColor(tripId) {
  const hue = (Number(tripId) * 57) % 360;
  return `hsl(${hue} 70% 55%)`;
}

// Global Leaflet popup theming so popups align with app theme
export const MapGlobalStyles = createGlobalStyle`
  .leaflet-container {
    background: ${p => p.theme.colors.backgroundSecondary};
  }
  .leaflet-popup-content-wrapper {
    background: ${p => p.theme.colors.card};
    color: ${p => p.theme.colors.text};
    border: 1px solid ${p => p.theme.colors.border};
    box-shadow: ${p => p.theme.shadows.md};
  }
  .leaflet-popup-tip {
    background: ${p => p.theme.colors.card};
    border: 1px solid ${p => p.theme.colors.border};
  }
  .leaflet-tooltip {
    background: ${p => p.theme.colors.card};
    color: ${p => p.theme.colors.text};
    border: 1px solid ${p => p.theme.colors.border};
  }
`;
