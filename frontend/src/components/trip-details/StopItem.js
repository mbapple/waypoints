import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { StopCard } from "./trip-detail-components";
import { Button, Text, Flex, Badge } from "../../styles/components";
import { getPlaceLink } from "../map-integration-components";
import PhotoSlideshowSmall from "../photos/PhotoSlideshowSmall";
import useExpandPhotos from "./useExpandPhotos";
import { listPhotosByStop } from "../../api/photos";

function StopItem({ stop, tripID, expanded, setExpanded, entityPhotos, setEntityPhotos }) {
  const key = `stop:${stop.id}`;
  const fetchPhotos = useCallback(() => listPhotosByStop(stop.id), [stop.id]);
  const { isExpanded, photos, toggle } = useExpandPhotos({ key, expanded, setExpanded, entityPhotos, setEntityPhotos, fetchPhotos });

  return (
    <StopCard>
      <Flex justify="space-between" align="center">
        <h5>
          {stop.name} &nbsp;&nbsp; <Badge variant="info">{stop.category}</Badge>
        </h5>
        <Button
          as={Link}
          to={`/trip/${tripID}/update-stop?stopID=${stop.id}`}
          variant="ghost"
          size="sm"
          aria-label={`Edit stop ${stop.name}`}
        >
          Edit
        </Button>
      </Flex>
      <Flex justify="space-between" align="center">
        <Link to={getPlaceLink(stop.osm_id, stop.osm_name)} target="_blank" rel="noopener noreferrer">
          <Text variant="muted" size="sm">
            <strong>Location:</strong> (OSM: {stop.osm_name || 'N/A'})
          </Text>
        </Link>
        <Button variant="ghost" size="sm" onClick={toggle}>
          {isExpanded ? '▴ Collapse' : '▾ Expand'}
        </Button>
      </Flex>
      {isExpanded && (
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
      )}
    </StopCard>
  );
}

export default StopItem;
