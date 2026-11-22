// Helpers to map results from PlaceSearchInput into our data shapes
export function placeToOsmFields(place) {
  return {
    latitude: place?.lat ?? "",
    longitude: place?.lon ?? "",
    osmName: place?.name ?? "",
    osmID: place?.osm_id ?? "",
    osmCountry: place?.osm_country ?? "",
    osmState: place?.osm_state ?? "",
    shortName: place?.shortName ?? "", // UI-only (display-name autofill); not sent to the API
  };
}

// Short display name for a place: the settlement from the address, else the
// first part of the full name ("Paris, Île-de-France, France" -> "Paris").
export function placeShortName(place) {
  const a = place?.address || {};
  return (
    a.city || a.town || a.village || a.hamlet || a.municipality ||
    String(place?.display_name || place?.name || "").split(",")[0].trim()
  );
}

export function placeToLegStart(place) {
  return {
    start_latitude: place?.lat ?? "",
    start_longitude: place?.lon ?? "",
    start_osm_name: place?.name ?? "",
    start_osm_id: place?.osm_id ?? "",
    start_osm_country: place?.osm_country ?? "",
    start_osm_state: place?.osm_state ?? "",
  };
}

export function placeToLegEnd(place) {
  return {
    end_latitude: place?.lat ?? "",
    end_longitude: place?.lon ?? "",
    end_osm_name: place?.name ?? "",
    end_osm_id: place?.osm_id ?? "",
    end_osm_country: place?.osm_country ?? "",
    end_osm_state: place?.osm_state ?? "",
  };
}
