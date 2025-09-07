import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { LegCard } from "./trip-detail-components";
import { Button, Text, Flex, Badge } from "../../styles/components";
import { getTransportTypeLabel } from "../../utils/format";
import PhotoSlideshowSmall from "../photos/PhotoSlideshowSmall";
import StopItem from "./StopItem";
import ContextMenu, { ContextMenuItem } from "../common/ContextMenu";
import useExpandPhotos from "./useExpandPhotos";
import { listPhotosByLeg } from "../../api/photos";

function LegItem({ leg, tripID, getNodeName, expanded, setExpanded, entityPhotos, setEntityPhotos, stops = [] }) {
  const key = `leg:${leg.id}`;
  const fetchPhotos = useCallback(() => listPhotosByLeg(leg.id), [leg.id]);
  const { isExpanded, photos, toggle } = useExpandPhotos({ key, expanded, setExpanded, entityPhotos, setEntityPhotos, fetchPhotos });

  // Context menu state
  const [menu, setMenu] = React.useState({ open: false, x: 0, y: 0 });
  const onContextMenu = (e) => {
    e.preventDefault();
    setMenu({ open: true, x: e.clientX, y: e.clientY });
  };

  return (
    <LegCard onContextMenu={onContextMenu} style={{ position: 'relative' }}>
      <>
        <Flex justify="space-between" align="flex-start">
          <h4>{leg.name || `${getTransportTypeLabel(leg.type)} ${getNodeName(leg.start_node_id)} to ${getNodeName(leg.end_node_id)}`}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {leg.date && <Badge variant="primary">{leg.date}</Badge>}
            <Button variant="ghost" size="sm" onClick={toggle}>
              {isExpanded ? '▴' : '▾'}
            </Button>
          </div>
        </Flex>
        {isExpanded && (
          <div style={{ marginTop: '0.75rem' }}>
            {photos && photos.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <PhotoSlideshowSmall photos={photos} />
              </div>
            )}
            {leg.description && (
              <Text variant="secondary" size="sm" style={{ marginBottom: '0.75rem' }}>
                {leg.description}
              </Text>
            )}
            {leg.notes && (
              <Text variant="muted" size="sm" style={{ marginBottom: '0.75rem' }}>
                <strong>Notes:</strong> {leg.notes}
              </Text>
            )}
            {/* Nested Stops inside expanded Leg */}
            {stops && stops.length > 0 && (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
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
          <Link to={`/trip/${tripID}/update-leg?legID=${leg.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <ContextMenuItem>Edit</ContextMenuItem>
          </Link>
        </ContextMenu>
      </>
    </LegCard>
  );
}

export default LegItem;
