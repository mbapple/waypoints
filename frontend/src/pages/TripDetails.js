import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../components/page-components";
import { getPlaceLink } from "../components/map-integration-components";
import { TripInfoCard, NodeCard, ActionButtons, EmptyState, StopCard } from "../components/trip-detail-components";
import { Button, Text, Grid, Flex, Badge } from "../styles/components";
import { getTrip, getTripMiles } from "../api/trips";
import { listNodesByTrip } from "../api/nodes";
import { listLegsByTrip } from "../api/legs";
import { listStopsByTrip } from "../api/stops";
import { getTransportTypeLabel } from "../utils/format";

function TripDetails() {
  const { tripID } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [legs, setLegs] = useState([]);
  const [stops, setStops] = useState([]);
  // const [legsAndNodes, setLegsAndNodes] = useState([]);

  const [miles, setMiles] = useState(0);

  useEffect(() => {
    const fetchTripData = async () => {
      try {
        const [tripData, nodesData, legsData, stopsData] = await Promise.all([
          getTrip(tripID),
          listNodesByTrip(tripID),
          listLegsByTrip(tripID),
          listStopsByTrip(tripID),
        ]);
        setTrip(tripData);
        setNodes(nodesData);
        setLegs(legsData);
        setStops(stopsData);

        // Fetch miles separately
        try {
          const milesData = await getTripMiles(tripID);
          if (milesData && typeof milesData.total_miles !== 'undefined') {
            setMiles(milesData.total_miles);
          }
        } catch (e) {
          // Non-blocking
          console.warn('Failed to fetch miles', e);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTripData();
  }, [tripID]);

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
          <div style={{ marginTop: '1rem' }}>
            <Button as={Link} to="/" variant="primary">
              Back to Trips
            </Button>
          </div>
      </PageHeader>
      </div>
    );
  }

  // Combine and sort nodes and legs
  const getOrderedItinerary = () => {
    const items = [];
    
    // Sort nodes by arrival_date
    const sortedNodes = [...nodes].sort((a, b) => new Date(a.arrival_date) - new Date(b.arrival_date));
    
    sortedNodes.forEach((node, nodeIndex) => {
      // Add the node
      items.push({ type: 'node', data: node, order: nodeIndex * 2 });
      
      // Find and add legs that start from this node
      const nodeLegs = legs.filter(leg => leg.start_node_id === node.id);
      nodeLegs.forEach((leg, legIndex) => {
        items.push({ type: 'leg', data: leg, order: nodeIndex * 2 + 1 + legIndex * 0.1 });
      });
    });
    
    // Sort by order to ensure proper sequence
    return items.sort((a, b) => a.order - b.order);
  };

  const orderedItinerary = getOrderedItinerary();

  // getTransportTypeLabel moved to utils/format

  const getNodeName = (nodeID) => {
    const node = nodes.find(n => n.id === nodeID);
    return node ? node.name : `Node ${nodeID}`;
  };




  // Helper functions to get stops for legs and nodes
  const getStopsForLeg = (legID) => {
    console.log("Getting stops for leg ID:", legID, stops);
    return stops.filter(stop => stop.leg_id === legID);
  };
  const getStopsForNode = (nodeID) => {
    return stops.filter(stop => stop.node_id === nodeID);
  };

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

      {/* Trip information Card */}
      <TripInfoCard>
        <Flex justify="space-between" align="flex-start">
          <h3>Trip Information</h3>
          <Button as={Link} to={`/trip/${tripID}/update`} variant="ghost" size="sm" aria-label="Edit Trip">
            Edit
          </Button>
        </Flex>
        <Text variant="secondary">
          <strong>Description:</strong> {trip.description || "No description provided."}
        </Text>
        <Text variant="secondary" style={{ display: 'block', marginTop: '1rem' }}>
          <strong>Total Miles:</strong> {miles} miles
        </Text>
      </TripInfoCard>

      
      {/* Itinerary Section */}
      <div>
        <Flex justify="space-between" align="center" style={{ marginBottom: '1.5rem' }}>
          <h2>Trip Itinerary</h2>
          <Text variant="muted">
            {nodes.length} {nodes.length === 1 ? 'destination' : 'destinations'}, {legs.length} {legs.length === 1 ? 'leg' : 'legs'}
          </Text>
        </Flex>

        {orderedItinerary.length === 0 ? (
          <EmptyState>
            <h3>No itinerary items yet</h3>
            <Text variant="muted">
              Start building your itinerary by adding your first destination!
            </Text>
          </EmptyState>
        ) : (
          <Grid columns={1}>
            {orderedItinerary.map((item, index) => (
              <div key={`${item.type}-${item.data.id}`}>
                <NodeCard>
                  {item.type === 'node' ? (
                    <>
                      <Flex justify="space-between" align="flex-start">
                        <h4>{item.data.name}</h4>
                        <Button
                          as={Link}
                          to={`/trip/${tripID}/update-node?nodeID=${item.data.id}`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit node ${item.data.name}`}
                        >
                          Edit
                        </Button>
                      </Flex>
                      {item.data.description && (
                        <Text variant="secondary" size="sm" style={{ marginBottom: '0.75rem' }}>
                          {item.data.description}
                        </Text>
                      )}
                      <Flex gap={2} align="center" style={{ marginBottom: '0.5rem' }}>
                        <Badge variant="success">{item.data.arrival_date}</Badge>
                        <Text variant="muted" size="xs">to</Text>
                        <Badge variant="warning">{item.data.departure_date}</Badge>
                      </Flex>
                      {item.data.notes && (
                        <Text variant="muted" size="sm">
                          <strong>Notes:</strong> {item.data.notes}
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      <Flex justify="space-between" align="flex-start">
                        <h4>{item.data.name || `${getTransportTypeLabel(item.data.type)} ${getNodeName(item.data.start_node_id)} to ${getNodeName(item.data.end_node_id)}`}</h4>
                        <Button
                          as={Link}
                          to={`/trip/${tripID}/update-leg?legID=${item.data.id}`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit leg ${item.data.id}`}
                        >
                          Edit
                        </Button>
                      </Flex>
                      {item.data.description && (
                        <Text variant="secondary" size="sm" style={{ marginBottom: '0.75rem' }}>
                          {item.data.description}
                        </Text>
                      )}
                      {item.data.notes && (
                        <Text variant="muted" size="sm">
                          <strong>Notes:</strong> {item.data.notes}
                        </Text>
                      )}
                    </>
                  )}
                </NodeCard>
                {/* Display stops for this node or leg */}
                {item.type === 'node' ? 
                  getStopsForNode(item.data.id).map(stop => (
                    <StopCard key={stop.id}>
                      <Flex justify="space-between" align="center">
                        <h5>
                          {stop.name}   <Badge variant="info">{stop.category}</Badge>
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
                      <Link to={getPlaceLink(stop.osm_id, stop.osm_name)} target="_blank" rel="noopener noreferrer">
                        <Text variant="muted" size="sm">
                          <strong>Location:</strong> (OSM: {stop.osm_name || 'N/A'})
                        </Text>
                      </Link>
                      <div>
                        {stop.notes && (
                          <Text variant="muted" size="sm">
                            <strong>Notes:</strong> {stop.notes}
                          </Text>
                        )}
                      </div>
                    </StopCard>
                  )) :
                  getStopsForLeg(item.data.id).map(stop => (
                    <StopCard key={stop.id}>
                      <Flex justify="space-between" align="center">
                        <h5>
                          {stop.name}   <Badge variant="info">{stop.category}</Badge>
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
                      <Link to={getPlaceLink(stop.osm_id, stop.osm_name)} target="_blank" rel="noopener noreferrer">
                        <Text variant="muted" size="sm">
                          <strong>Location:</strong> (OSM: {stop.osm_name || 'N/A'})
                        </Text>
                      </Link>
                      <div>
                        {stop.notes && (
                          <Text variant="muted" size="sm">
                            <strong>Notes:</strong> {stop.notes}
                          </Text>
                      )}
                      </div>
                    </StopCard>
                  ))
                }
              </div>
            ))}
          </Grid>
        )}
      </div>

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
        <Button
          as={Link}
          to={`/trip/${tripID}/add-stop`}
          variant="primary"
        >
          + Add Stop
        </Button>
      </ActionButtons>
    </div>
  );
}

export default TripDetails;
