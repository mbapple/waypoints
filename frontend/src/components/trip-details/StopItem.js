import React, { useCallback } from "react";
import StopItemCard from "./StopItemCard";
import useExpandPhotos from "./useExpandPhotos";
import { listPhotosByStop } from "../../api/photos";

function StopItem({ stop, tripID, expanded, setExpanded, entityPhotos, setEntityPhotos }) {
  const key = `stop:${stop.id}`;
  const fetchPhotos = useCallback(() => listPhotosByStop(stop.id), [stop.id]);
  const { isExpanded, photos, toggle } = useExpandPhotos({ key, expanded, setExpanded, entityPhotos, setEntityPhotos, fetchPhotos });

  return (
    <StopItemCard
      stop={stop}
      tripID={tripID}
      isExpanded={isExpanded}
      photos={photos}
      onToggle={toggle}
    />
  );
}

export default StopItem;
