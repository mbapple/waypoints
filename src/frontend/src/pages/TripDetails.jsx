import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../components/page-components";
import { AddButtons, TripInfoCard } from "../components/trip-details/trip-detail-components";
import { Button, Text, Flex, Badge, Select } from "../styles/components";
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
import TripDetailsList from "../components/trip-details/TripDetailsList";
import TripDetailsDaily from "../components/trip-details/TripDetailsDaily";
import NodePopup from "../components/trip-details/popups/NodePopup";
import LegPopup from "../components/trip-details/popups/LegPopup";
import StopPopup from "../components/trip-details/popups/StopPopup";

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
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'daily'
  const [popupEntity, setPopupEntity] = useState(null); // { type: 'node'|'leg'|'stop', data: obj }

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


  // Use freshly fetched legsData (not state) to build road (car/bus) polylines
  const roadLegs = (legsData || []).filter((leg) => {
            const t = (leg.type || "").toLowerCase();
            return t === "car" || t === "bus";
          });
        const pairs = await Promise.all(
          roadLegs.map(async (leg) => {
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

  const getNodeName = (nodeID) => { // retained for possible future use (e.g., upload select labels)
    const node = nodes.find(n => n.id === nodeID);
    return node ? node.name : `Node ${nodeID}`;
  };


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

      {/* Itinerary / Daily Toggle Section */}
      <div style={{ marginBottom: '2rem' }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Trip Details</h2>
          <Flex gap={2}>
            <Button variant={viewMode === 'list' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('list')}>List</Button>
            <Button variant={viewMode === 'daily' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('daily')}>Daily</Button>
          </Flex>
        </Flex>
        {viewMode === 'list' ? (
          <TripDetailsList
            tripID={tripID}
            nodes={nodes}
            legs={legs}
            stops={stops}
            expanded={expanded}
            setExpanded={setExpanded}
            entityPhotos={entityPhotos}
            setEntityPhotos={setEntityPhotos}
            onEntityClick={(type, data) => setPopupEntity({ type, data })}
          />
        ) : (
          <TripDetailsDaily
            trip={trip}
            tripID={tripID}
            nodes={nodes}
            legs={legs}
            stops={stops}
            expanded={expanded}
            setExpanded={setExpanded}
            entityPhotos={entityPhotos}
            setEntityPhotos={setEntityPhotos}
            onEntityClick={(type, data) => setPopupEntity({ type, data })}
          />
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

      {/* Centralized popup renderer */}
      {popupEntity && popupEntity.type === 'node' && (
        <NodePopup node={popupEntity.data} currentTripId={tripID} onClose={() => setPopupEntity(null)} />
      )}
      {popupEntity && popupEntity.type === 'leg' && (() => { const startNode = nodes.find(n=>n.id===popupEntity.data.start_node_id); const endNode = nodes.find(n=>n.id===popupEntity.data.end_node_id); return (
        <LegPopup
          leg={popupEntity.data}
          startName={startNode?.name || 'Start'}
            endName={endNode?.name || 'End'}
          startNode={startNode}
          endNode={endNode}
          onClose={() => setPopupEntity(null)}
        />); })()}
      {popupEntity && popupEntity.type === 'stop' && (
        <StopPopup stop={popupEntity.data} onClose={() => setPopupEntity(null)} />
      )}
    </div>
  );
}

export default TripDetails;
