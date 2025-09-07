import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../components/page-components";
import { AddButtons, TripInfoCard, EmptyState } from "../components/trip-details/trip-detail-components";
import NodeItem from "../components/trip-details/NodeItem";
import LegItem from "../components/trip-details/LegItem";
import InvisibleNodeItem from "../components/trip-details/InvisibleNodeItem";
import { TravelGroupCard } from "../components/trip-details/trip-detail-components";
import { Button, Text, Grid, Flex, Badge, Select } from "../styles/components";
import MapView from "../components/MapView";
import { buildMapLayersForTrip } from "../utils/mapData";
// import TripMiniMap from "../components/TripMiniMap";
import { getTrip, getTripMiles } from "../api/trips";
import { listNodesByTrip } from "../api/nodes";
import { listLegsByTrip, getCarDetails } from "../api/legs";
import { listStopsByTrip } from "../api/stops";
import { getTransportTypeLabel } from "../utils/format";
import { listPhotosByTrip, listPhotosByLeg, listPhotosByNode, listPhotosByStop } from "../api/photos";
import PhotoSlideshowLarge from "../components/photos/PhotoSlideshowLarge";
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
  const [carPolylineByLeg, setCarPolylineByLeg] = useState({});

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


  // Use freshly fetched legsData (not state) to build car polylines
  const carLegs = (legsData || []).filter((leg) => (leg.type || "").toLowerCase() === "car");
        const pairs = await Promise.all(
          carLegs.map(async (leg) => {
            try {
              const details = await getCarDetails(leg.id);
              return [leg.id, details?.polyline || null];
            } catch {
              return [leg.id, null];
            }
          })
        );
        setCarPolylineByLeg(Object.fromEntries(pairs));

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

  const { markers, stopMarkers, polylines, bounds, nodeById, visitedCountries, visitedStates } = useMemo(() =>
      buildMapLayersForTrip({ nodes, legs, stops, carPolylineByLeg, tripID })
    , [nodes, legs, stops, carPolylineByLeg, tripID]);

  // Identify the first and last nodes by arrival_date (must be before early returns to satisfy Hooks rules)
  const { firstNodeId, lastNodeId } = useMemo(() => {
    if (!nodes || nodes.length === 0) return { firstNodeId: undefined, lastNodeId: undefined };
    const sorted = [...nodes].sort((a, b) => new Date(a.arrival_date) - new Date(b.arrival_date));
    return { firstNodeId: sorted[0]?.id, lastNodeId: sorted[sorted.length - 1]?.id };
  }, [nodes]);

    
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

  // Build itinerary entries that group legs passing through invisible nodes between two visible nodes.
  const getItineraryWithGroups = () => {
    const entries = [];
    const nodeByIdMap = new Map(nodes.map(n => [n.id, n]));
    const legsByStart = new Map();
    for (const l of legs) {
      if (!legsByStart.has(l.start_node_id)) legsByStart.set(l.start_node_id, []);
      legsByStart.get(l.start_node_id).push(l);
    }
    // Sort legs per start node by their date if present
    for (const list of legsByStart.values()) {
      list.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    }
    const visibleNodes = [...nodes]
      .sort((a, b) => new Date(a.arrival_date) - new Date(b.arrival_date))
      .filter(n => !n.invisible);
    const consumedLegIds = new Set();

    for (const start of visibleNodes) {
      // Always show visible node card
      entries.push({ kind: 'node', node: start });

      const outLegs = legsByStart.get(start.id) || [];
      for (const firstLeg of outLegs) {
        if (consumedLegIds.has(firstLeg.id)) continue;

        let currentLeg = firstLeg;
        let foundInvisible = false;
        let endVisible = null;
        const sequence = [];
        let safety = 0;
        while (currentLeg && safety++ < 100) {
          sequence.push({ type: 'leg', leg: currentLeg });
          consumedLegIds.add(currentLeg.id);
          const nextNode = nodeByIdMap.get(currentLeg.end_node_id);
          if (!nextNode) break;
          if (nextNode.invisible) {
            foundInvisible = true;
            sequence.push({ type: 'node', node: nextNode });
            // Find next leg from this invisible node that's not consumed
            const nextLeg = (legsByStart.get(nextNode.id) || []).find(l => !consumedLegIds.has(l.id));
            if (!nextLeg) break;
            currentLeg = nextLeg;
          } else {
            endVisible = nextNode;
            break;
          }
        }

        if (foundInvisible && endVisible) {
          entries.push({ kind: 'travel-group', fromNode: start, toNode: endVisible, sequence });
        } else if (!foundInvisible) {
          // No invisibles encountered: render standalone leg
          entries.push({ kind: 'leg', leg: firstLeg });
        }
      }
    }

    return entries;
  };

  const itineraryWithGroups = getItineraryWithGroups();

  const getNodeName = (nodeID) => {
    const node = nodes.find(n => n.id === nodeID);
    return node ? node.name : `Node ${nodeID}`;
  };

  // Helper functions to get stops for legs and nodes
  const getStopsForLeg = (legID) => stops.filter(stop => stop.leg_id === legID);
  const getStopsForNode = (nodeID) => stops.filter(stop => stop.node_id === nodeID);


  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>{trip.name}</h1>
            <Flex gap={3} align="center" style={{ marginTop: '0.5rem' }}>
              <Badge variant="primary">{trip.start_date}</Badge>
              <Text>→</Text>
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

      {/* Mini Map
      <div style={{ marginBottom: '1.25rem' }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: '0.5rem' }}>
          <h3>Map preview</h3>
          <Button as={Link} to={`/trip/${tripID}/map`} variant="ghost" size="sm">Open full map →</Button>
        </Flex>
        <TripMiniMap tripID={tripID} nodes={nodes} legs={legs} />
      </div> */}
      {/* Mini Map */}
      <div style={{ marginBottom: '7vh', height: "30vh"}}>
        <Flex justify="space-between" align="center" style={{ marginBottom: '0.5rem' }}>
          <h3>Map preview</h3>
          <Button as={Link} to={`/trip/${tripID}/map`} variant="ghost" size="sm">Open full map →</Button>
        </Flex>
        <MapView
          markers={markers}
          stopMarkers={stopMarkers}
          polylines={polylines}
          bounds={bounds}
          highlightMode={"off"}
          nodeById={nodeById}
          visitedCountries={visitedCountries}
          visitedStates={visitedStates}
          pathForTripId={() => `/trip/${tripID}`}
          linkLabel="View trip details"
        />
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
            {nodes.length} {nodes.length === 1 ? 'destination' : 'destinations'}
          </Text>
        </Flex>

        {itineraryWithGroups.length === 0 ? (
          <EmptyState>
            <h3>No itinerary items yet</h3>
            <Text variant="muted">
              Start building your itinerary by adding your first destination!
            </Text>
          </EmptyState>
        ) : (
          <Grid columns={1}>
            {itineraryWithGroups.map((entry, idx) => (
              <div key={`entry-${idx}`}>
                {entry.kind === 'node' ? (
                  <NodeItem
                    node={entry.node}
                    tripID={tripID}
                    expanded={expanded}
                    setExpanded={setExpanded}
                    entityPhotos={entityPhotos}
                    setEntityPhotos={setEntityPhotos}
                    stops={getStopsForNode(entry.node.id)}
                    isFirstNode={entry.node.id === firstNodeId}
                    isLastNode={entry.node.id === lastNodeId}
                  />
                ) : entry.kind === 'leg' ? (
                  <LegItem
                    leg={entry.leg}
                    tripID={tripID}
                    getNodeName={getNodeName}
                    expanded={expanded}
                    setExpanded={setExpanded}
                    entityPhotos={entityPhotos}
                    setEntityPhotos={setEntityPhotos}
                    stops={getStopsForLeg(entry.leg.id)}
                  />
                ) : entry.kind === 'travel-group' ? (
                  <TravelGroupCard>
                    <Flex justify="space-between" align="center">
                      <h4>Travel from {entry.fromNode.name} to {entry.toNode.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(prev => ({ ...prev, [
                          `group:${entry.fromNode.id}-${entry.toNode.id}`
                        ]: !prev[`group:${entry.fromNode.id}-${entry.toNode.id}`] }))}
                      >
                        {expanded[`group:${entry.fromNode.id}-${entry.toNode.id}`] ? '▴' : '▾'}
                      </Button>
                    </Flex>
                    {expanded[`group:${entry.fromNode.id}-${entry.toNode.id}`] && (
                      <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                        {entry.sequence.map((seg, sidx) => (
                          seg.type === 'leg' ? (
                            <LegItem
                              key={`gleg-${sidx}-${seg.leg.id}`}
                              leg={seg.leg}
                              tripID={tripID}
                              getNodeName={getNodeName}
                              expanded={expanded}
                              setExpanded={setExpanded}
                              entityPhotos={entityPhotos}
                              setEntityPhotos={setEntityPhotos}
                              stops={getStopsForLeg(seg.leg.id)}
                            />
                          ) : (
                            <InvisibleNodeItem
                              key={`gnode-${sidx}-${seg.node.id}`}
                              node={seg.node}
                              tripID={tripID}
                              expanded={expanded}
                              setExpanded={setExpanded}
                              entityPhotos={entityPhotos}
                              setEntityPhotos={setEntityPhotos}
                            />
                          )
                        ))}
                      </div>
                    )}
                  </TravelGroupCard>
                ) : null}
              </div>
            ))}
          </Grid>
        )}
      </div>

      {/* Bottom unified upload container */}
      <TripInfoCard>
        <h3>Upload Photos</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Select value={uploadTarget} onChange={e => setUploadTarget(e.target.value)}>
            <option value="">Select target…</option>
            {nodes.map(n => (
              <option key={`node:${n.id}`} value={`node:${n.id}`}>Node: {n.name}</option>
            ))}
            {legs.map(l => (
              <option key={`leg:${l.id}`} value={`leg:${l.id}`}>
                Leg: {getTransportTypeLabel(l.type)} {getNodeName(l.start_node_id)} → {getNodeName(l.end_node_id)}
              </option>
            ))}
            {stops.map(s => (
              <option key={`stop:${s.id}`} value={`stop:${s.id}`}>Stop: {s.name}</option>
            ))}
          </Select>
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
      <AddButtons tripID={tripID} style={{ marginTop: '1.5rem', marginBottom: '3.0rem' }} />
    </div>
  );
}

export default TripDetails;
