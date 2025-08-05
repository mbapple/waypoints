import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import styled from "styled-components";
import { Card, Button, Text, Grid, Flex, Badge } from "../styles/components";

const PageHeader = styled.div`
  margin: ${props => props.theme.space[8]} 0 ${props => props.theme.space[6]} 0;
`;

const TripInfoCard = styled(Card)`
  margin-bottom: ${props => props.theme.space[8]};
`;

const NodeCard = styled(Card)`
  transition: ${props => props.theme.transitions.base};
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

const ActionButtons = styled(Flex)`
  gap: ${props => props.theme.space[3]};
  margin: ${props => props.theme.space[6]} 0;
  
  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const DangerZone = styled(Card)`
  border-color: ${props => props.theme.colors.danger};
  background: rgba(239, 68, 68, 0.05);
  margin-top: ${props => props.theme.space[8]};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.space[12]} ${props => props.theme.space[8]};
  color: ${props => props.theme.colors.textMuted};
`;

function TripDetails() {
  const { tripID } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchTripData = async () => {
      try {
        const tripResponse = await axios.get(`http://localhost:3001/api/trips/${tripID}`);
        setTrip(tripResponse.data);
        
        const nodesResponse = await axios.get(`http://localhost:3001/api/nodes/by_trip/${tripID}`);
        setNodes(nodesResponse.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTripData();
  }, [tripID]);

  const handleDeleteTrip = async () => {
    if (!window.confirm("Are you sure you want to delete this trip? This action cannot be undone.")) {
      return;
    }
    
    setDeleting(true);
    try {
      await axios.delete(`http://localhost:3001/api/trips/${tripID}`);
      window.location.href = "/";
    } catch (err) {
      alert("Failed to delete trip.");
      console.error(err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader>
          <Text variant="muted">Loading trip details...</Text>
        </PageHeader>
      </div>
    );
  }

  if (!trip) {
    return (
      <div>
        <PageHeader>
          <h1>Trip Not Found</h1>
          <Text variant="muted">The trip you're looking for doesn't exist.</Text>
          <Button as={Link} to="/" variant="primary" style={{ marginTop: '1rem' }}>
            Back to Trips
          </Button>
        </PageHeader>
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>{trip.name}</h1>
            <Flex gap={3} align="center" style={{ marginTop: '0.5rem' }}>
              <Badge variant="primary">{trip.start_date}</Badge>
              <Text variant="muted">→</Text>
              <Badge variant="primary">{trip.end_date}</Badge>
            </Flex>
          </div>
          <Button as={Link} to="/" variant="outline">
            ← Back to Trips
          </Button>
        </Flex>
      </PageHeader>

      <TripInfoCard>
        <h3>Trip Information</h3>
        <Text variant="secondary">
          <strong>Description:</strong> {trip.description || "No description provided."}
        </Text>
      </TripInfoCard>

      <ActionButtons>
        <Button 
          as={Link} 
          to={`/trip/${tripID}/add-node`} 
          variant="primary"
        >
          + Add Node
        </Button>
        <Button 
          as={Link} 
          to={`/trip/${tripID}/add-leg`} 
          variant="secondary"
        >
          + Add Leg
        </Button>
      </ActionButtons>

      <div>
        <Flex justify="space-between" align="center" style={{ marginBottom: '1.5rem' }}>
          <h2>Destinations</h2>
          <Text variant="muted">
            {nodes.length} {nodes.length === 1 ? 'destination' : 'destinations'}
          </Text>
        </Flex>

        {nodes.length === 0 ? (
          <EmptyState>
            <h3>No destinations yet</h3>
            <Text variant="muted">
              Start building your itinerary by adding your first destination!
            </Text>
            <Button 
              as={Link} 
              to={`/trip/${tripID}/add-node`} 
              variant="primary" 
              style={{ marginTop: '1rem' }}
            >
              Add First Destination
            </Button>
          </EmptyState>
        ) : (
          <Grid columns={2}>
            {nodes.map(node => (
              <NodeCard key={node.id}>
                <h4>{node.name}</h4>
                {node.description && (
                  <Text variant="secondary" size="sm" style={{ marginBottom: '0.75rem' }}>
                    {node.description}
                  </Text>
                )}
                <Flex gap={2} align="center" style={{ marginBottom: '0.5rem' }}>
                  <Badge variant="success">{node.arrival_date}</Badge>
                  <Text variant="muted" size="xs">to</Text>
                  <Badge variant="warning">{node.departure_date}</Badge>
                </Flex>
                {node.notes && (
                  <Text variant="muted" size="sm">
                    <strong>Notes:</strong> {node.notes}
                  </Text>
                )}
              </NodeCard>
            ))}
          </Grid>
        )}
      </div>

      <DangerZone>
        <h3 style={{ color: '#ef4444', marginBottom: '1rem' }}>Danger Zone</h3>
        <Text variant="muted" style={{ marginBottom: '1rem' }}>
          Once you delete a trip, there is no going back. Please be certain.
        </Text>
        <Button
          onClick={handleDeleteTrip}
          variant="danger"
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete Trip'}
        </Button>
      </DangerZone>
    </div>
  );
}

export default TripDetails;
