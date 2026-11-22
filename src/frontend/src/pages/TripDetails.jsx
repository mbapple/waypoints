import React, { useEffect, useState, useMemo } from "react";
import useDocumentTitle from "../utils/useDocumentTitle";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../components/page-components";
import { Button, Text, Flex } from "../styles/components";
import MapView from "../components/MapView";
import { buildMapLayersForTrip } from "../utils/mapData";
import { getTrip, getTripMiles } from "../api/trips";
import { listNodesByTrip } from "../api/nodes";
import { listLegsByTrip, loadLegPolylines } from "../api/legs";
import { listStopsByTrip } from "../api/stops";
import { listPhotosByTrip } from "../api/photos";
import { refreshStopCategoryEmojis } from "../styles/mapTheme";
import PhotoSlideshowLarge from "../components/photos/PhotoSlideshowLarge";
import PhotoUploadButton from "../components/photos/PhotoUploadButton";
import PhotoTargetSelect from "../components/photos/PhotoTargetSelect";
import ImmichPickerPopup from "../components/photos/ImmichPickerPopup";
import { getIntegrationStatus } from "../api/integrations";
import TripItinerary from "../components/trip-details/TripItinerary";
import { HERO_HEIGHT, Header, Crumb, TripMeta, Description, Actions, Hero, SectionHeader, PhotoBar } from "../components/trip-details/trip-page-styles";
import { CameraIcon, EditIcon, MapIcon, PlusIcon } from "../components/common/Icons";
import { dateRange, fmtTripRange, photosByEntity } from "../utils/itinerary";
import NodePopup from "../components/trip-details/popups/NodePopup";
import LegPopup from "../components/trip-details/popups/LegPopup";
import StopPopup from "../components/trip-details/popups/StopPopup";

function TripDetails() {
  const { tripID } = useParams();
  const [trip, setTrip] = useState(null);
  useDocumentTitle(trip?.name);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [legs, setLegs] = useState([]);
  const [stops, setStops] = useState([]);
  const [tripPhotos, setTripPhotos] = useState([]);
  const [uploadTarget, setUploadTarget] = useState(""); // e.g. node:3 / leg:5 / stop:7
  const [carPolylineByLeg, setCarPolylineByLeg] = useState({});
  const [flightPolylineByLeg, setFlightPolylineByLeg] = useState({});
  const [popupEntity, setPopupEntity] = useState(null); // { type: 'node'|'leg'|'stop', data: obj } (for 'leg', data may be an array of chained legs)
  const [immichConfigured, setImmichConfigured] = useState(false);
  const [immichOpen, setImmichOpen] = useState(false);
  const [, setEmojiVersion] = useState(0);

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

        // Use freshly fetched legsData (not state) for road routes and flight tracks
        const polylines = await loadLegPolylines(legsData);
        setCarPolylineByLeg(polylines.carPolylineByLeg);
        setFlightPolylineByLeg(polylines.flightPolylineByLeg);

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

  useEffect(() => {
    getIntegrationStatus()
      .then(s => setImmichConfigured(!!s?.immich_configured))
      .catch(() => setImmichConfigured(false));
    // Category emojis come from the API; re-render once they're cached
    refreshStopCategoryEmojis().then(() => setEmojiVersion(v => v + 1));
  }, []);

  // Trip photos grouped by stop / node / leg, for the popups
  const photosOf = useMemo(() => photosByEntity(tripPhotos), [tripPhotos]);

  const { markers, stopMarkers, polylines, bounds, nodeById, visitedCountries, visitedStates } = useMemo(() =>
      buildMapLayersForTrip({ nodes, legs, stops, carPolylineByLeg, flightPolylineByLeg, tripID })
    , [nodes, legs, stops, carPolylineByLeg, flightPolylineByLeg, tripID]);

  if (loading) {
    return (
      <PageHeader>
        <Text variant="muted">Loading trip details...</Text>
      </PageHeader>
    );
  }

  if (!trip) {
    return (
      <PageHeader>
        <h1>Trip Not Found</h1>
        <Text variant="muted">The trip you're looking for doesn't exist.</Text>
        <div style={{ marginTop: '1rem' }}>
          <Button as={Link} to="/" variant="primary">Back to Trips</Button>
        </div>
      </PageHeader>
    );
  }

  // After adding or removing a photo: reload the trip's photos (the itinerary groups them by stop/node/leg)
  const refreshPhotos = async () => {
    try { setTripPhotos(await listPhotosByTrip(tripID)); } catch {}
  };

  const dayCount = trip.start_date && trip.end_date ? dateRange(trip.start_date, trip.end_date).length : 0;
  const nodeCount = nodes.filter(n => !n.invisible).length;
  const openEntity = (type, data) => setPopupEntity({ type, data });

  return (
    <div>
      <Header>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <Crumb to="/">← All trips</Crumb>
          <h1>{trip.name}</h1>
          <TripMeta>
            <span>{fmtTripRange(trip.start_date, trip.end_date)}</span>
            {dayCount > 0 && <span>{dayCount} {dayCount === 1 ? 'day' : 'days'}</span>}
            {nodeCount > 0 && <span>{nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}</span>}
            {miles > 0 && <span>{Number(miles).toLocaleString(undefined, { maximumFractionDigits: 1 })} mi</span>}
          </TripMeta>
          {trip.description && <Description>{trip.description}</Description>}
        </div>
        <Actions>
          <Button as={Link} to={`/trip/${tripID}/map`} variant="outline" size="sm"><MapIcon size={14} /> Full map</Button>
          <Button as={Link} to={`/trip/${tripID}/update`} variant="outline" size="sm"><EditIcon size={14} /> Edit trip</Button>
        </Actions>
      </Header>

      <Hero $photos={tripPhotos.length > 0}>
        {tripPhotos.length > 0 && <PhotoSlideshowLarge photos={tripPhotos} image_height={HERO_HEIGHT} expandable onPhotoRemoved={refreshPhotos} />}
        <div className="hero-map">
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
      </Hero>

      <SectionHeader>
        <h2>Itinerary</h2>
        <Flex gap={2} wrap>
          <Button as={Link} to={`/trip/${tripID}/add-node`} variant="ghost" size="sm"><PlusIcon size={14} /> Add Node</Button>
          <Button as={Link} to={`/trip/${tripID}/add-leg`} variant="ghost" size="sm"><PlusIcon size={14} /> Add Leg</Button>
          <Button as={Link} to={`/trip/${tripID}/add-stop`} variant="ghost" size="sm"><PlusIcon size={14} /> Add Stop</Button>
        </Flex>
      </SectionHeader>

      <TripItinerary
        trip={trip}
        tripID={tripID}
        nodes={nodes}
        legs={legs}
        stops={stops}
        photos={tripPhotos}
        onOpen={openEntity}
      />

      <PhotoBar>
        <span className="label"><CameraIcon size={15} /> Add photos to</span>
        <PhotoTargetSelect nodes={nodes} legs={legs} stops={stops} value={uploadTarget} onChange={setUploadTarget} placeholder="The trip (no specific item)" />
        <PhotoUploadButton
          tripId={tripID}
          nodeId={uploadTarget.startsWith('node:') ? Number(uploadTarget.split(':')[1]) : undefined}
          legId={uploadTarget.startsWith('leg:') ? Number(uploadTarget.split(':')[1]) : undefined}
          stopId={uploadTarget.startsWith('stop:') ? Number(uploadTarget.split(':')[1]) : undefined}
          onUploaded={refreshPhotos}
        />
        {immichConfigured && (
          <Button variant="outline" size="sm" onClick={() => setImmichOpen(true)}>Link from Immich</Button>
        )}
      </PhotoBar>
      {immichOpen && (
        <ImmichPickerPopup
          tripId={tripID}
          nodes={nodes}
          legs={legs}
          stops={stops}
          onClose={() => setImmichOpen(false)}
          onLinked={refreshPhotos}
        />
      )}

      {/* Centralized popup renderer */}
      {popupEntity && popupEntity.type === 'node' && (
        <NodePopup node={popupEntity.data} photos={photosOf.node.get(popupEntity.data.id)} onClose={() => setPopupEntity(null)} onPhotosChanged={refreshPhotos} />
      )}
      {popupEntity && popupEntity.type === 'leg' && (
        <LegPopup
          legs={[].concat(popupEntity.data)}
          nodes={nodes}
          photosByLeg={photosOf.leg}
          onClose={() => setPopupEntity(null)}
          onPhotosChanged={refreshPhotos}
        />
      )}
      {popupEntity && popupEntity.type === 'stop' && (
        <StopPopup stop={popupEntity.data} photos={photosOf.stop.get(popupEntity.data.id)} onClose={() => setPopupEntity(null)} onPhotosChanged={refreshPhotos} />
      )}
    </div>
  );
}

export default TripDetails;
