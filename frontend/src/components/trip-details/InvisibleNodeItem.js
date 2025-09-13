import React, { useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { NodeCard } from "./trip-detail-components";
import { Text, Flex, Badge } from "../../styles/components";
import { getPlaceLink } from "../map-integration-components";
import PhotoSlideshowSmall from "../photos/PhotoSlideshowSmall";
import ContextMenu, { ContextMenuItem } from "../common/ContextMenu";
import useExpandPhotos from "./useExpandPhotos";
import { listPhotosByNode } from "../../api/photos";

function InvisibleNodeItem({ node, tripID, expanded, setExpanded, entityPhotos, setEntityPhotos, onEntityClick }) {
  const key = `node:${node.id}`;
  const fetchPhotos = useCallback(() => listPhotosByNode(node.id), [node.id]);
  const { photos, refresh } = useExpandPhotos({ key, expanded, setExpanded, entityPhotos, setEntityPhotos, fetchPhotos });

  useEffect(() => {
    if (!photos) refresh();
  }, [photos, refresh]);

  const [menu, setMenu] = React.useState({ open: false, x: 0, y: 0 });
  const onContextMenu = (e) => {
    e.preventDefault();
    setMenu({ open: true, x: e.clientX, y: e.clientY });
  };

  return (
    <NodeCard onContextMenu={onContextMenu} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onEntityClick?.('node', node)}>
      <Flex justify="space-between" align="flex-start">
        <h4>{node.name}</h4>
        <Flex gap={3} align="center">
          <Badge variant="primary">{node.arrival_date}</Badge>
          <Text>→</Text>
          <Badge variant="primary">{node.departure_date}</Badge>
        </Flex>
      </Flex>
      <Flex style={{ marginBottom: '1.0rem' }}>
        <Link to={getPlaceLink(node.osm_id, node.osm_name)} target="_blank" rel="noopener noreferrer">
          <Text variant="muted" size="sm">
            <strong>Location:</strong> (OSM: {node.osm_name || 'N/A'})
          </Text>
        </Link>
      </Flex>
      <div style={{ marginTop: '0.75rem' }}>
        {photos && photos.length > 0 && (
          <div style={{ marginBottom: '0.5rem' }}>
            <PhotoSlideshowSmall photos={photos} />
          </div>
        )}
      </div>

      <ContextMenu open={menu.open} x={menu.x} y={menu.y} onClose={() => setMenu((m) => ({ ...m, open: false }))}>
        <Link to={`/trip/${tripID}/update-node?nodeID=${node.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <ContextMenuItem>Edit</ContextMenuItem>
        </Link>
      </ContextMenu>
    </NodeCard>
  );
}

export default InvisibleNodeItem;
