import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
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

// Leaflet 1.9 finishes a zoom animation from a 250ms setTimeout (_onZoomTransitionEnd), and the
// scroll-wheel handler debounces its zoom with another timer, but map.remove() cancels neither.
// When a map page unmounts mid-zoom the timer then runs on the removed map and throws
// "can't access property _leaflet_pos, el is undefined" from _getMapPanePos. Make both no-ops
// once the map is gone. Applied once, when this module is first imported (every map imports it).
let _unmountFixApplied = false;
function applyLeafletUnmountFix() {
  if (_unmountFixApplied) return;
  _unmountFixApplied = true;
  const proto = L.Map.prototype;
  const onZoomTransitionEnd = proto._onZoomTransitionEnd;
  if (typeof onZoomTransitionEnd === 'function') {
    proto._onZoomTransitionEnd = function (...args) {
      if (!this._mapPane) { this._animatingZoom = false; return; } // map was removed
      return onZoomTransitionEnd.apply(this, args);
    };
  }
  L.Map.addInitHook(function () {
    this.on('unload', function () { clearTimeout(this.scrollWheelZoom?._timer); }, this);
  });
}
applyLeafletUnmountFix();

// ---------- Zoom-dependent marker sizing ----------
// Markers are sized by CSS (see MapGlobalStyles) from a class on the map container, so they stay
// small when zoomed out and grow when zoomed in without rebuilding any Leaflet icons.
//   wp-zoom-low  (zoom < 5, world/continent): tiny node dots, stops hidden, adventures as dots
//   wp-zoom-mid  (5 <= zoom < 9, region):      small node dots, stops as small trip-colored dots
//   wp-zoom-high (zoom >= 9, city):            larger node dots, emoji stop/adventure icons
// A map without the class (no <MapZoomClass/>) gets the mid node size and full emoji icons.
export const ZOOM_LOW_BELOW = 5;
export const ZOOM_HIGH_FROM = 9;
const ZOOM_BANDS = ['low', 'mid', 'high'];

export function getZoomBand(zoom) {
  if (zoom < ZOOM_LOW_BELOW) return 'low';
  if (zoom < ZOOM_HIGH_FROM) return 'mid';
  return 'high';
}

// Render inside <MapContainer> to keep the wp-zoom-* class in sync with the map's zoom.
export function MapZoomClass() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const update = () => {
      const band = getZoomBand(map.getZoom());
      ZOOM_BANDS.forEach((b) => el.classList.toggle(`wp-zoom-${b}`, b === band));
    };
    update();
    map.on('zoomend', update);
    return () => {
      map.off('zoomend', update);
      ZOOM_BANDS.forEach((b) => el.classList.remove(`wp-zoom-${b}`));
    };
  }, [map]);
  return null;
}

// Return a tile layer config matching the current theme.
// Both themes use the keyless OpenStreetMap tiles; dark mode applies a CSS filter
// to the tile layer only (see .map-tiles-dark in MapGlobalStyles), so markers,
// routes and highlight overlays keep their colors.
// Pass `key={isDark ? 'dark' : 'light'}` on <TileLayer> so the class re-applies on theme change.
export function getTileLayerConfig(isDark) {
  return {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    className: isDark ? 'map-tiles-dark' : '',
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

// All map icons are zero-size DivIcons whose inner <span> is centered on the point by CSS, so
// MapGlobalStyles can resize them per zoom band without a stale iconSize/anchor. Icons are cached
// so markers don't get a new icon object (and DOM element) on every render.
const _iconCache = new Map();
function cachedDivIcon(key, html) {
  let icon = _iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: 'wp-marker',
      html,
      iconSize: null,
      popupAnchor: [0, -8],
      tooltipAnchor: [0, -8],
    });
    _iconCache.set(key, icon);
  }
  return icon;
}

// Only allow simple color strings (hex, rgb()/hsl() etc.) into the inline style
function safeCssColor(color) {
  return /^[#a-zA-Z0-9(),.%\s]+$/.test(color || '') ? color : '#888';
}

// Compact trip-colored dot for a trip node (replaces the default 25x41 Leaflet pin)
export function createNodeDivIcon(color) {
  const c = safeCssColor(color);
  return cachedDivIcon(`node|${c}`, `<span class="wp-node" style="--wp-c:${c}"></span>`);
}

// Stop icon: category emoji in a circle ringed with the trip color
export function createStopDivIcon(category, color) {
  const emoji = getStopEmoji(category);
  const c = safeCssColor(color);
  return cachedDivIcon(`stop|${emoji}|${c}`, `<span class="wp-stop" style="--wp-c:${c}">${emoji}</span>`);
}

// Adventure icon: like a stop but with a thicker accent-colored ring
export function createAdventureDivIcon(category) {
  const emoji = getStopEmoji(category); // reuse category emoji (could differentiate later)
  return cachedDivIcon(`adv|${emoji}`, `<span class="wp-adventure">${emoji}</span>`);
}

// Global Leaflet popup theming so popups align with app theme
export const MapGlobalStyles = createGlobalStyle`
  .leaflet-container {
    background: ${p => p.theme.colors.backgroundSecondary};
  }
  /* Dark map: invert OSM tiles, then rotate hue back so water stays blue-ish */
  .map-tiles-dark {
    filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9);
  }
  /* ----- Markers (see cachedDivIcon / MapZoomClass) ----- */
  .leaflet-marker-icon.wp-marker {
    background: none;
    border: none;
  }
  .wp-marker > span {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    line-height: 1;
    user-select: none;
    transition: width 0.15s, height 0.15s, font-size 0.15s;
  }
  /* Invisible padding so small dots are still easy to hover/tap */
  .wp-marker > span::before {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
  }
  .wp-node {
    width: 11px;
    height: 11px;
    background: var(--wp-c);
    border: 2px solid ${p => p.theme.colors.card};
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
  }
  .wp-stop {
    width: 22px;
    height: 22px;
    font-size: 13px;
    background: ${p => p.theme.colors.card};
    border: 2px solid var(--wp-c);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  }
  .wp-adventure {
    width: 26px;
    height: 26px;
    font-size: 14px;
    background: ${p => p.theme.colors.card};
    border: 3px solid ${p => p.theme.colors.accent};
    box-shadow: 0 0 0 2px ${p => p.theme.colors.background};
  }
  .wp-zoom-low .wp-node {
    width: 8px;
    height: 8px;
    border-width: 1.5px;
  }
  .wp-zoom-high .wp-node {
    width: 16px;
    height: 16px;
    border-width: 3px;
  }
  .wp-zoom-low .wp-stop {
    display: none;
  }
  .wp-zoom-mid .wp-stop {
    width: 8px;
    height: 8px;
    font-size: 0;
    background: var(--wp-c);
    border: 1.5px solid ${p => p.theme.colors.card};
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  }
  .wp-zoom-low .wp-adventure {
    width: 9px;
    height: 9px;
    font-size: 0;
    background: ${p => p.theme.colors.accent};
    border: 1.5px solid ${p => p.theme.colors.card};
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  }
  .wp-zoom-mid .wp-adventure {
    width: 18px;
    height: 18px;
    font-size: 10px;
    border-width: 2px;
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
