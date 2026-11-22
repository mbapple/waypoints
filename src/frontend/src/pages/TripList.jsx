import React, { useEffect, useState } from "react";
import useDocumentTitle from "../utils/useDocumentTitle";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Button, Text } from "../styles/components";
import { listTrips } from "../api/trips";
import { listCoverPhotos } from "../api/photos";
import PhotoSlideshowLarge from "../components/photos/PhotoSlideshowLarge";
import { ListHeader } from "../components/page-components";
import {
  CardGrid, MediaCard, MediaPlaceholder, MediaCardBody, MediaCardTitle,
  MetaLine, MetaItem, CalendarIcon, MoonIcon, MountainIcon, useMediaHeight,
} from "../components/common/MediaCard";
import { formatDateRange, nightsBetween } from "../utils/format";

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.space[12]} ${props => props.theme.space[4]};
  color: ${props => props.theme.colors.textMuted};
`;

function TripList() {
  useDocumentTitle("My Trips");
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tripPhotos, setTripPhotos] = useState({});
  const imageHeight = useMediaHeight();
  const navigate = useNavigate();

  // Cards render as soon as the trips arrive; their photos (one request for all
  // trips) fill in when ready, with the placeholder shown meanwhile.
  useEffect(() => {
    listTrips().then(setTrips).catch(console.error).finally(() => setLoading(false));
    listCoverPhotos('trip').then(setTripPhotos).catch(console.error);
  }, []);

  const openTrip = (id) => navigate(`/trip/${id}`);

  if (loading) {
    return (
      <div>
        <ListHeader>
          <div>
            <h1>My Trips</h1>
            <Text variant="muted">Loading your trips...</Text>
          </div>
        </ListHeader>
      </div>
    );
  }

  return (
    <div>
      <ListHeader>
        <div>
          <h1>My Trips</h1>
          <Text variant="muted">
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
          </Text>
        </div>
        <Button as={Link} to="/create" variant="primary">
          + New Trip
        </Button>
      </ListHeader>

      {trips.length === 0 ? (
        <EmptyState>
          <h3>No trips yet</h3>
          <Button
            as={Link}
            to="/create"
            variant="primary"
            style={{ marginTop: '0.75rem' }}
          >
            Create Your First Trip
          </Button>
        </EmptyState>
      ) : (
        <CardGrid>
          {trips.map(trip => {
            const photos = tripPhotos[trip.id] || [];
            const nights = nightsBetween(trip.start_date, trip.end_date);
            return (
              <MediaCard
                key={trip.id}
                role="link"
                tabIndex={0}
                aria-label={trip.name}
                onClick={() => openTrip(trip.id)}
                onKeyDown={e => {
                  if (e.target !== e.currentTarget) return; // let inner controls handle their own keys
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTrip(trip.id); }
                }}
              >
                {photos.length > 0 ? (
                  <PhotoSlideshowLarge photos={photos} image_height={imageHeight} rounded={false} />
                ) : (
                  <MediaPlaceholder $height={imageHeight}><MountainIcon size={36} /></MediaPlaceholder>
                )}
                <MediaCardBody>
                  <MediaCardTitle title={trip.name}>
                    <Link to={`/trip/${trip.id}`} onClick={e => e.stopPropagation()} tabIndex={-1}>
                      {trip.name}
                    </Link>
                  </MediaCardTitle>
                  <MetaLine>
                    <MetaItem><CalendarIcon />{formatDateRange(trip.start_date, trip.end_date)}</MetaItem>
                    {nights > 0 && (
                      <MetaItem><MoonIcon />{nights} {nights === 1 ? 'night' : 'nights'}</MetaItem>
                    )}
                  </MetaLine>
                </MediaCardBody>
              </MediaCard>
            );
          })}
        </CardGrid>
      )}
    </div>
  );
}

export default TripList;
