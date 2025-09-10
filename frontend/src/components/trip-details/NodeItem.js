import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { NodeCard } from "./trip-detail-components";
import { Button, Text, Flex, Badge } from "../../styles/components";
import { getPlaceLink } from "../map-integration-components";
import PhotoSlideshowSmall from "../photos/PhotoSlideshowSmall";
import StopItem from "./StopItem";
import ContextMenu, { ContextMenuItem } from "../common/ContextMenu";
import useExpandPhotos from "./useExpandPhotos";
import { listPhotosByNode } from "../../api/photos";

function NodeItem({ node, tripID, expanded, setExpanded, entityPhotos, setEntityPhotos, stops = [] }) {
  const key = `node:${node.id}`;
  const fetchPhotos = useCallback(() => listPhotosByNode(node.id), [node.id]);
  const { isExpanded, photos, toggle } = useExpandPhotos({ key, expanded, setExpanded, entityPhotos, setEntityPhotos, fetchPhotos });

  // Context menu state
  const [menu, setMenu] = React.useState({ open: false, x: 0, y: 0 });
  const onContextMenu = (e) => {
    e.preventDefault();
    setMenu({ open: true, x: e.clientX, y: e.clientY });
  };

  return (
    <NodeCard onContextMenu={onContextMenu} style={{ position: 'relative' }}>
      <Flex justify="space-between" align="flex-start">
        <h4>{node.name}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {(!node.arrival_date || !node.departure_date || node.arrival_date === node.departure_date) ? (
            <Flex gap={3} align="center">
              <Badge variant="primary">{node.arrival_date || node.departure_date || ''}</Badge>
            </Flex>
          ) : (
            <Flex gap={3} align="center">
              <Badge variant="primary">{node.arrival_date}</Badge>
              <Text>→</Text>
              <Badge variant="primary">{node.departure_date}</Badge>
            </Flex>
          )}
          <Button variant="ghost" size="sm" onClick={toggle}>
            {isExpanded ? '▴' : '▾'}
          </Button>
        </div>
      </Flex>
      <Flex style={{ marginBottom: '1.0rem' }}>
        <Link to={getPlaceLink(node.osm_id, node.osm_name)} target="_blank" rel="noopener noreferrer">
          <Text variant="muted" size="sm">
            <strong>Location:</strong> (OSM: {node.osm_name || 'N/A'})
          </Text>
        </Link>
      </Flex>
      {isExpanded && (
        <div style={{ marginTop: '0.75rem' }}>
          {photos && photos.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <PhotoSlideshowSmall photos={photos} />
            </div>
          )}
          {node.description && (
            <Text variant="secondary" size="sm" style={{ marginBottom: '0.75rem' }}>
              {node.description}
            </Text>
          )}
          {node.notes && (
            <Text variant="muted" size="sm">
              <strong>Notes:</strong> {node.notes}
            </Text>
          )}
          {/* Nested Stops inside expanded Node */}
          {stops && stops.length > 0 && (
            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
              {stops.map((stop) => (
                <StopItem
                  key={stop.id}
                  stop={stop}
                  tripID={tripID}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  entityPhotos={entityPhotos}
                  setEntityPhotos={setEntityPhotos}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {/* Context menu */}
      <ContextMenu open={menu.open} x={menu.x} y={menu.y} onClose={() => setMenu((m) => ({ ...m, open: false }))}>
        <Link to={`/trip/${tripID}/update-node?nodeID=${node.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <ContextMenuItem>Edit</ContextMenuItem>
        </Link>
      </ContextMenu>
    </NodeCard>
  );
}

export default NodeItem;
