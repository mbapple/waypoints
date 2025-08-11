import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../components/page-components";
import { getPlaceLink } from "../components/map-integration-components";
import { TripInfoCard, NodeCard, ActionButtons, EmptyState, StopCard } from "../components/trip-detail-components";
import { Button, Text, Grid, Flex, Badge } from "../styles/components";
import TripMiniMap from "../components/TripMiniMap";
import { getTrip, getTripMiles } from "../api/trips";
import { listNodesByTrip } from "../api/nodes";
import { listLegsByTrip } from "../api/legs";
import { listStopsByTrip } from "../api/stops";
import { getTransportTypeLabel } from "../utils/format";
import { listPhotosByTrip, listPhotosByLeg, listPhotosByNode, listPhotosByStop } from "../api/photos";
import PhotoSlideshowLarge from "../components/photos/PhotoSlideshowLarge";
import PhotoSlideshowSmall from "../components/photos/PhotoSlideshowSmall";
import PhotoUploadButton from "../components/photos/PhotoUploadButton";

function TripDetails() {
  const { tripID } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [legs, setLegs] = useState([]);
  const [stops, setStops] = useState([]);
  const [tripPhotos, setTripPhotos] = useState([]);
  const [entityPhotos, setEntityPhotos] = useState({}); // cache by type:id
  const [expanded, setExpanded] = useState({}); // key: type:id -> bool
  const [uploadTarget, setUploadTarget] = useState(""); // e.g. node:3 / leg:5 / stop:7

  const [miles, setMiles] = useState(0);

  useEffect(() => {
    const fetchTripData = async () => {
      try {
        const [tripData, nodesData, legsData, stopsData, photosData] = await Promise.all([
          getTrip(tripID),
          listNodesByTrip(tripID),
          listLegsByTrip(tripID),
          listStopsByTrip(tripID),
          listPhotosByTrip(tripID)
        ]);
        setTrip(tripData);
        setNodes(nodesData);
        setLegs(legsData);
        setStops(stopsData);
        setTripPhotos(photosData);

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

      {/* Large slideshow above the map */}
      {tripPhotos && tripPhotos.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <PhotoSlideshowLarge photos={tripPhotos} />
        </div>
      )}

      {/* Mini Map */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Map preview</h3>
          <Button as={Link} to={`/trip/${tripID}/map`} variant="ghost" size="sm">Open full map →</Button>
        </Flex>
        <TripMiniMap tripID={tripID} nodes={nodes} legs={legs} />
      </div>

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
                      {/* View photos dropdown and upload */}
                      {/* Collapsible: name + date visible, details/photos on expand */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text variant="muted" size="sm">{item.data.arrival_date}</Text>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const key = `node:${item.data.id}`;
                            setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
                            if (!entityPhotos[key]) {
                              try {
                                const p = await listPhotosByNode(item.data.id);
                                setEntityPhotos(prev => ({ ...prev, [key]: p }));
                              } catch {}
                            }
                          }}
                        >
                          {expanded[`node:${item.data.id}`] ? '▴ Collapse' : '▾ Expand'}
                        </Button>
                      </div>
                      {expanded[`node:${item.data.id}`] && (
                        <div style={{ marginTop: '0.75rem' }}>
                          {entityPhotos[`node:${item.data.id}`] && entityPhotos[`node:${item.data.id}`].length > 0 && (
                            <div style={{ marginBottom: '0.75rem' }}>
                              <PhotoSlideshowSmall photos={entityPhotos[`node:${item.data.id}`]} />
                            </div>
                          )}
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
                        </div>
                      )}
                      {/* description shown in expanded section */}
                      <Flex gap={2} align="center" style={{ marginBottom: '0.5rem' }}>
                        <Badge variant="success">{item.data.arrival_date}</Badge>
                        <Text variant="muted" size="xs">to</Text>
                        <Badge variant="warning">{item.data.departure_date}</Badge>
                      </Flex>
                      {/* notes shown in expanded section */}
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
                      {/* View photos dropdown and upload */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text variant="muted" size="sm">{item.data.date}</Text>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const key = `leg:${item.data.id}`;
                            setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
                            if (!entityPhotos[key]) {
                              try {
                                const p = await listPhotosByLeg(item.data.id);
                                setEntityPhotos(prev => ({ ...prev, [key]: p }));
                              } catch {}
                            }
                          }}
                        >
                          {expanded[`leg:${item.data.id}`] ? '▴ Collapse' : '▾ Expand'}
                        </Button>
                      </div>
                      {expanded[`leg:${item.data.id}`] && (
                        <div style={{ marginTop: '0.75rem' }}>
                          {entityPhotos[`leg:${item.data.id}`] && entityPhotos[`leg:${item.data.id}`].length > 0 && (
                            <div style={{ marginBottom: '0.75rem' }}>
                              <PhotoSlideshowSmall photos={entityPhotos[`leg:${item.data.id}`]} />
                            </div>
                          )}
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
                        </div>
                      )}
                      {/* description shown in expanded section */}
                      {/* notes shown in expanded section */}
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
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.5rem' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const key = `stop:${stop.id}`;
                            setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
                            if (!entityPhotos[key]) {
                              try {
                                const p = await listPhotosByStop(stop.id);
                                setEntityPhotos(prev => ({ ...prev, [key]: p }));
                              } catch {}
                            }
                          }}
                        >
                          {expanded[`stop:${stop.id}`] ? '▴ Collapse' : '▾ Expand'}
                        </Button>
                      </div>
                      {expanded[`stop:${stop.id}`] && (
                        <div style={{ marginTop: '0.5rem' }}>
                          {entityPhotos[`stop:${stop.id}`] && entityPhotos[`stop:${stop.id}`].length > 0 && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <PhotoSlideshowSmall photos={entityPhotos[`stop:${stop.id}`]} />
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
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.5rem' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const key = `stop:${stop.id}`;
                            setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
                            if (!entityPhotos[key]) {
                              try {
                                const p = await listPhotosByStop(stop.id);
                                setEntityPhotos(prev => ({ ...prev, [key]: p }));
                              } catch {}
                            }
                          }}
                        >
                          {expanded[`stop:${stop.id}`] ? '▴ Collapse' : '▾ Expand'}
                        </Button>
                      </div>
                      {expanded[`stop:${stop.id}`] && (
                        <div style={{ marginTop: '0.5rem' }}>
                          {entityPhotos[`stop:${stop.id}`] && entityPhotos[`stop:${stop.id}`].length > 0 && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <PhotoSlideshowSmall photos={entityPhotos[`stop:${stop.id}`]} />
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
                  ))
                }
              </div>
            ))}
          </Grid>
        )}
      </div>

      {/* Bottom unified upload container */}
      <TripInfoCard>
        <h3 style={{ marginTop: 0 }}>Upload Photos</h3>
        <Text variant="muted" size="sm" style={{ marginBottom: '0.5rem' }}>
          Choose a Node, Leg, or Stop to attach new photos.
        </Text>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={uploadTarget} onChange={e => setUploadTarget(e.target.value)}>
            <option value="">Select target…</option>
            {nodes.map(n => (
              <option key={`node:${n.id}`} value={`node:${n.id}`}>Node: {n.name}</option>
            ))}
            {legs.map(l => (
              <option key={`leg:${l.id}`} value={`leg:${l.id}`}>Leg: {getTransportTypeLabel(l.type)} {getNodeName(l.start_node_id)} → {getNodeName(l.end_node_id)}</option>
            ))}
            {stops.map(s => (
              <option key={`stop:${s.id}`} value={`stop:${s.id}`}>Stop: {s.name}</option>
            ))}
          </select>
          <PhotoUploadButton
            tripId={tripID}
            nodeId={uploadTarget.startsWith('node:') ? Number(uploadTarget.split(':')[1]) : undefined}
            legId={uploadTarget.startsWith('leg:') ? Number(uploadTarget.split(':')[1]) : undefined}
            stopId={uploadTarget.startsWith('stop:') ? Number(uploadTarget.split(':')[1]) : undefined}
            onUploaded={async () => {
              try {
                const p = await listPhotosByTrip(tripID);
                setTripPhotos(p);
                // Refresh cache for selected entity
                if (uploadTarget) {
                  const [type, idStr] = uploadTarget.split(':');
                  const id = Number(idStr);
                  if (type === 'node') {
                    setEntityPhotos(prev => ({ ...prev, [`node:${id}`]: undefined }));
                    const ph = await listPhotosByNode(id);
                    setEntityPhotos(prev => ({ ...prev, [`node:${id}`]: ph }));
                  } else if (type === 'leg') {
                    setEntityPhotos(prev => ({ ...prev, [`leg:${id}`]: undefined }));
                    const ph = await listPhotosByLeg(id);
                    setEntityPhotos(prev => ({ ...prev, [`leg:${id}`]: ph }));
                  } else if (type === 'stop') {
                    setEntityPhotos(prev => ({ ...prev, [`stop:${id}`]: undefined }));
                    const ph = await listPhotosByStop(id);
                    setEntityPhotos(prev => ({ ...prev, [`stop:${id}`]: ph }));
                  }
                }
              } catch {}
            }}
          />
        </div>
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
