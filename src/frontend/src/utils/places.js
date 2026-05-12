// Helpers to map results from PlaceSearchInput into our data shapes
export function placeToOsmFields(place) {
  return {
    latitude: place?.lat ?? "",
    longitude: place?.lon ?? "",
    osmName: place?.name ?? "",
    osmID: place?.osm_id ?? "",
    osmCountry: place?.osm_country ?? "",
    osmState: place?.osm_state ?? "",
  };
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
