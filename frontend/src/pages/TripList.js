import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Card, Button, Text, Grid, Flex, Badge } from "../styles/components";
import { listTrips } from "../api/trips";

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

const TripLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: block;
`;

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
  
  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = () => {
    listTrips()
      .then((res) => {
        setTrips(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
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
        <Text variant="secondary" size="lg">
          Track your adventures and create new memories
        </Text>
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
          <Text variant="muted">
            Start planning your next adventure by creating your first trip!
          </Text>
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
            <TripLink key={trip.id} to={`/trip/${trip.id}`}>
              <TripCard>
                <TripTitle>{trip.name}</TripTitle>
                <DateRange variant="secondary">
                  <Badge variant="primary">{trip.start_date}</Badge>
                  <Text variant="muted">→</Text>
                  <Badge variant="primary">{trip.end_date}</Badge>
                </DateRange>
                <Text variant="muted" size="sm">
                  Click to view details and manage this trip
                </Text>
              </TripCard>
            </TripLink>
          ))}
        </Grid>
      )}
    </div>
  );
}

export default TripList;