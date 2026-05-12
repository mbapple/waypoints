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

// ---------- Dynamic category emoji support ----------
// We keep a lightweight in-memory cache of categories (id, name, emoji)
let _stopCategoryCache = [];
let _lastCategoryFetch = 0;
let _fetchInFlight = null;
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// No per-category fallback; if no custom emoji, use a generic pin

function _shouldRefreshCategories() {
  return Date.now() - _lastCategoryFetch > CATEGORY_CACHE_TTL_MS || _stopCategoryCache.length === 0;
}

function _refreshCategories() {
  if (_fetchInFlight) return _fetchInFlight;
  _fetchInFlight = import('../api/stop_categories')
    .then(mod => mod.getStopCategories())
    .then(data => {
      _stopCategoryCache = Array.isArray(data) ? data : [];
      _lastCategoryFetch = Date.now();
    })
    .catch(() => { /* swallow; keep old cache */ })
    .finally(() => { _fetchInFlight = null; });
  return _fetchInFlight;
}

// Public function to manually refresh (returns a promise)
export function refreshStopCategoryEmojis(force = false) {
  if (force) {
    _lastCategoryFetch = 0; // invalidate
  }
  return _refreshCategories();
}

// Synchronous emoji getter used by map markers. If cache stale, it triggers a background refresh.
export function getStopEmoji(category) {
  const key = (category || '').toLowerCase();
  if (_shouldRefreshCategories()) {
    // fire & forget
    _refreshCategories();
  }
  const match = _stopCategoryCache.find(c => c.name === key);
  if (match && match.emoji) return match.emoji;
  return '📌';
}

// Optional async variant if a caller wants to await freshest data
export async function getStopEmojiAsync(category) {
  await refreshStopCategoryEmojis();
  return getStopEmoji(category);
}

// Create a Leaflet DivIcon for a stop, with emoji and optional color border
export function createStopDivIcon(category, color) {
  const emoji = getStopEmoji(category);
  const safeColor = color || '#888';
  const html = `<span class="stop-emoji" style="border-color:${safeColor}; background-color:${safeColor}22">${emoji}</span>`;
  return L.divIcon({
    className: 'stop-emoji-icon',
    html,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
    tooltipAnchor: [0, -12],
  });
}

// Adventure icon: visually similar to stop but thicker border and different background tint.
export function createAdventureDivIcon(category) {
  const emoji = getStopEmoji(category); // reuse category emoji (could differentiate later)
  const html = `<span class="adventure-emoji">${emoji}</span>`;
  return L.divIcon({
    className: 'adventure-emoji-icon',
    html,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
    tooltipAnchor: [0, -14],
  });
}

// Global Leaflet popup theming so popups align with app theme
export const MapGlobalStyles = createGlobalStyle`
  .leaflet-container {
    background: ${p => p.theme.colors.backgroundSecondary};
  }
  .leaflet-div-icon.stop-emoji-icon {
    background: transparent;
    border: none;
  }
  .stop-emoji {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    font-size: 1.2rem;
    line-height: 1;
    border: 1px solid currentColor;
    box-shadow: ${p => p.theme.shadows.sm};
    user-select: none;
  }
  .leaflet-div-icon.adventure-emoji-icon { background: transparent; border:none; }
  .adventure-emoji {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.65rem;
    height: 1.65rem;
    border-radius: 50%;
    font-size: 1.1rem;
    line-height: 1;
    border: 3px solid ${p => p.theme.colors.accent};
    background: ${p => p.theme.colors.accent}22;
    box-shadow: 0 0 0 2px ${p => p.theme.colors.background};
    user-select: none;
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
