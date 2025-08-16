import React, { useCallback } from "react";
import LegItemCard from "./LegItemCard";
import useExpandPhotos from "./useExpandPhotos";
import { listPhotosByLeg } from "../../api/photos";

function LegItem({ leg, tripID, getNodeName, expanded, setExpanded, entityPhotos, setEntityPhotos }) {
  const key = `leg:${leg.id}`;
  const fetchPhotos = useCallback(() => listPhotosByLeg(leg.id), [leg.id]);
  const { isExpanded, photos, toggle } = useExpandPhotos({ key, expanded, setExpanded, entityPhotos, setEntityPhotos, fetchPhotos });

  return (
    <LegItemCard
      leg={leg}
      tripID={tripID}
      getNodeName={getNodeName}
      isExpanded={isExpanded}
      photos={photos}
      onToggle={toggle}
    />
  );
}

export default LegItem;
