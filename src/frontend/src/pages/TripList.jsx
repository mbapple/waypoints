import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Button, Text } from "../styles/components";
import { listTrips } from "../api/trips";
import { listPhotosByTrip } from "../api/photos";
import PhotoSlideshowLarge from "../components/photos/PhotoSlideshowLarge";
import { ListHeader } from "../components/page-components";
import {
  CardGrid, MediaCard, MediaPlaceholder, MediaCardBody, MediaCardTitle,
  MetaLine, MetaItem, CalendarIcon, MoonIcon, MountainIcon,
} from "../components/common/MediaCard";
import { formatDateRange, nightsBetween } from "../utils/format";

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.space[12]} ${props => props.theme.space[4]};
  color: ${props => props.theme.colors.textMuted};
`;

function TripList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tripPhotos, setTripPhotos] = useState({});
  const [imageHeight, setImageHeight] = useState(220);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setImageHeight(window.innerWidth < 768 ? 200 : 220);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on initial render

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await listTrips();
      setTrips(res);
      // Fetch photos for each trip in parallel (first 5 for speed)
      const photoPromises = res.map(t => listPhotosByTrip(t.id).then(p => ({ id: t.id, photos: p.slice(0, 5) })).catch(() => ({ id: t.id, photos: [] })));
      const photoResults = await Promise.all(photoPromises);
      const grouped = {};
      photoResults.forEach(r => { grouped[r.id] = r.photos; });
      setTripPhotos(grouped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
