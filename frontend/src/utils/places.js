// Helpers to map results from PlaceSearchInput into our data shapes
export function placeToOsmFields(place) {
  return {
    latitude: place?.lat ?? "",
    longitude: place?.lon ?? "",
    osmName: place?.name ?? "",
    osmID: place?.osm_id ?? "",
  };
}

export function placeToLegStart(place) {
  return {
    start_latitude: place?.lat ?? "",
    start_longitude: place?.lon ?? "",
    start_osm_name: place?.name ?? "",
    start_osm_id: place?.osm_id ?? "",
  };
}

export function placeToLegEnd(place) {
  return {
    end_latitude: place?.lat ?? "",
    end_longitude: place?.lon ?? "",
    end_osm_name: place?.name ?? "",
    end_osm_id: place?.osm_id ?? "",
  };
}
