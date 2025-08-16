import React, { useCallback } from "react";
import NodeItemCard from "./NodeItemCard";
import useExpandPhotos from "./useExpandPhotos";
import { listPhotosByNode } from "../../api/photos";

function NodeItem({ node, tripID, expanded, setExpanded, entityPhotos, setEntityPhotos }) {
  const key = `node:${node.id}`;
  const fetchPhotos = useCallback(() => listPhotosByNode(node.id), [node.id]);
  const { isExpanded, photos, toggle } = useExpandPhotos({ key, expanded, setExpanded, entityPhotos, setEntityPhotos, fetchPhotos });

  return (
    <NodeItemCard
      node={node}
      tripID={tripID}
      isExpanded={isExpanded}
      photos={photos}
      onToggle={toggle}
    />
  );
}

export default NodeItem;
