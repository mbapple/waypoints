import React, { useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { StopCard } from "./trip-detail-components";
import { Text, Flex, Badge } from "../../styles/components";
import { getPlaceLink } from "../map-integration-components";
import PhotoSlideshowSmall from "../photos/PhotoSlideshowSmall";
import ContextMenu, { ContextMenuItem } from "../common/ContextMenu";
import useExpandPhotos from "./useExpandPhotos";
import { listPhotosByStop } from "../../api/photos";

function StopItem({ stop, tripID, expanded, setExpanded, entityPhotos, setEntityPhotos }) {
  const key = `stop:${stop.id}`;
  const fetchPhotos = useCallback(() => listPhotosByStop(stop.id), [stop.id]);
  const { photos, refresh } = useExpandPhotos({ key, expanded, setExpanded, entityPhotos, setEntityPhotos, fetchPhotos });

  // Auto-load photos since stop details are always visible now
  useEffect(() => {
    if (!photos) {
      refresh();
    }
  }, [photos, refresh]);

  // Context menu
  const [menu, setMenu] = React.useState({ open: false, x: 0, y: 0 });
  const onContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation(); // prevent parent Node/Leg context menu from opening
    setMenu({ open: true, x: e.clientX, y: e.clientY });
  };
  React.useEffect(() => {
    if (!menu.open) return;
    const hide = () => setMenu((m) => ({ ...m, open: false }));
    document.addEventListener('click', hide, { once: true });
    return () => document.removeEventListener('click', hide);
  }, [menu.open]);

  return (
    <StopCard onContextMenu={onContextMenu} style={{ position: 'relative' }}>
      <Flex justify="space-between" align="center">
        <h5>
          {stop.name} &nbsp;&nbsp; <Badge variant="info">{stop.category}</Badge>
        </h5>
      </Flex>
      <Flex justify="space-between" align="center">
        <Link to={getPlaceLink(stop.osm_id, stop.osm_name)} target="_blank" rel="noopener noreferrer">
          <Text variant="muted" size="sm">
            <strong>Location:</strong> (OSM: {stop.osm_name || 'N/A'})
          </Text>
        </Link>
      </Flex>
      <div style={{ marginTop: '0.5rem' }}>
        {photos && photos.length > 0 && (
          <div style={{ marginBottom: '0.5rem' }}>
            <PhotoSlideshowSmall photos={photos} />
          </div>
        )}
        {stop.notes && (
          <Text variant="muted" size="sm">
            <strong>Notes:</strong> {stop.notes}
          </Text>
        )}
      </div>
          <ContextMenu open={menu.open} x={menu.x} y={menu.y} onClose={() => setMenu((m) => ({ ...m, open: false }))}>
            <Link to={`/trip/${tripID}/update-stop?stopID=${stop.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <ContextMenuItem>Edit</ContextMenuItem>
            </Link>
          </ContextMenu>
    </StopCard>
  );
}

export default StopItem;
