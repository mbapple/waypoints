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

function NodeItem({ node, tripID, expanded, setExpanded, entityPhotos, setEntityPhotos, stops = [], onEntityClick }) {
  const key = `node:${node.id}`;
  const fetchPhotos = useCallback(() => listPhotosByNode(node.id), [node.id]);
  const { isExpanded, photos, toggle } = useExpandPhotos({ key, expanded, setExpanded, entityPhotos, setEntityPhotos, fetchPhotos });

  // Context menu state
  const [menu, setMenu] = React.useState({ open: false, x: 0, y: 0 });
  const onContextMenu = (e) => {
    e.preventDefault();
    setMenu({ open: true, x: e.clientX, y: e.clientY });
  };

  const canExpand = (stops && stops.length > 0); // only show expand if there are stops for this node
  return (
  <NodeCard onContextMenu={onContextMenu} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onEntityClick?.('node', node)}>
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
          {canExpand && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggle(); }}>
              {isExpanded ? '▴' : '▾'}
            </Button>
          )}
        </div>
      </Flex>
      <Flex style={{ marginBottom: '1.0rem' }}>
        <Link to={getPlaceLink(node.osm_id, node.osm_name)} target="_blank" rel="noopener noreferrer">
          <Text variant="muted" size="sm">
            <strong>Location:</strong> (OSM: {node.osm_name || 'N/A'})
          </Text>
        </Link>
      </Flex>
  {isExpanded && canExpand && (
        <div style={{ marginTop: '0.75rem' }}>
          {photos && photos.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <PhotoSlideshowSmall photos={photos} />
            </div>
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
