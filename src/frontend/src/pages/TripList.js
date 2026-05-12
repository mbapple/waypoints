import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Card, Button, Text, Grid, Flex, Badge } from "../styles/components";
import { listTrips } from "../api/trips";
import { listPhotosByTrip } from "../api/photos";
import PhotoSlideshowLarge from "../components/photos/PhotoSlideshowLarge";

const PageHeader = styled.div`
  margin: ${props => props.theme.space[8]} 0 ${props => props.theme.space[6]} 0;
  text-align: center;
`;

const TripCard = styled(Card)`
  transition: ${props => props.theme.transitions.base};
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.xl};
  }
`;

// Removed full-card Link wrapper to allow inner interactive controls (e.g., slideshow arrows)
// to receive clicks without triggering navigation. We'll navigate via onClick on the card.

const TripTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.space[2]};
  font-size: ${props => props.theme.fontSizes.lg};
`;

const DateRange = styled(Text)`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.space[2]};
  margin-bottom: ${props => props.theme.space[3]};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.space[16]} ${props => props.theme.space[8]};
  color: ${props => props.theme.colors.textMuted};
`;

function TripList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tripPhotos, setTripPhotos] = useState({});
  const [imageHeight, setImageHeight] = useState(200);
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleResize = () => {
      // Adjust image height based on window width
      if (window.innerWidth < 768) {
        setImageHeight(150); // Smaller height for smaller screens
      } else {
        setImageHeight(200); // Default height for larger screens
      }
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

  if (loading) {
    return (
      <div>
        <PageHeader>
          <h1>My Trips</h1>
          <Text variant="muted">Loading your adventures...</Text>
        </PageHeader>
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <h1>My Trips</h1>
      </PageHeader>

      <Flex justify="space-between" align="center" style={{ marginBottom: '2rem' }}>
        <Text variant="muted">
          {trips.length} {trips.length === 1 ? 'trip' : 'trips'} total
        </Text>
        <Button as={Link} to="/create" variant="primary">
          + Create New Trip
        </Button>
      </Flex>

      {trips.length === 0 ? (
        <EmptyState>
          <h3>No trips yet</h3>
          <Button 
            as={Link} 
            to="/create" 
            variant="primary" 
            style={{ marginTop: '1rem' }}
          >
            Create Your First Trip
          </Button>
        </EmptyState>
      ) : (
        <Grid columns={2}>
          {trips.map(trip => (
            <TripCard
              key={trip.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/trip/${trip.id}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/trip/${trip.id}`); } }}
            >
              {tripPhotos[trip.id] && tripPhotos[trip.id].length > 0 && (
                <div
                  style={{ marginBottom: '0.75rem' }}
                  onClick={e => { /* Allow slideshow arrow clicks without navigating */ e.stopPropagation(); }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <PhotoSlideshowLarge photos={tripPhotos[trip.id]} image_height={imageHeight} />
                </div>
              )}
              <TripTitle>
                <Link
                  to={`/trip/${trip.id}`}
                  onClick={e => e.stopPropagation()}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {trip.name}
                </Link>
              </TripTitle>
              <DateRange variant="secondary">
                <Badge variant="primary">{trip.start_date}</Badge>
                <Text variant="muted">→</Text>
                <Badge variant="primary">{trip.end_date}</Badge>
              </DateRange>
            </TripCard>
          ))}
        </Grid>
      )}
    </div>
  );
}

export default TripList;