import { api } from './client';

// Immich photo library. Every Immich request is made by the backend; these
// endpoints (and the image URLs they return) are WayPoints' own.

// -> { start_date, end_date, truncated, assets: [{ id, taken_at, date, latitude, longitude,
//      city, state, country, filename, linked, thumbnail_url, preview_url }] }
export const listTripImmichAssets = (tripId) =>
  api.get(`/integrations/immich/trips/${tripId}/assets`).then(r => r.data);

// { asset_id, trip_id, node_id?, leg_id?, stop_id?, description? } -> { id, url, immich_asset_id }
export const linkImmichAsset = (payload) =>
  api.post('/integrations/immich/link', payload).then(r => r.data);
