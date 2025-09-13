import React, { useEffect, useState } from 'react';
import Popup from '../../common/Popup';
import { Text, Flex, Badge } from '../../../styles/components';
import { Link } from 'react-router-dom';
import { getPlaceLink } from '../../map-integration-components';
import PhotoSlideshowLarge from '../../photos/PhotoSlideshowLarge';
import { listPhotosByLeg } from '../../../api/photos';
import { getTransportTypeLabel } from '../../../utils/format';
import { getCarDetails, getFlightDetails } from '../../../api/legs';

const LegPopup = ({ leg, onClose, startName, endName, startNode, endNode }) => {
  const [photos, setPhotos] = useState([]);
  const [car, setCar] = useState(null);
  const [flight, setFlight] = useState(null);
  useEffect(() => {
    if (!leg) return; let active = true; (async () => {
      try { const ph = await listPhotosByLeg(leg.id); if (active) setPhotos(ph || []); } catch {}
      try {
        if (['car','bus'].includes((leg.type||'').toLowerCase())) { const c = await getCarDetails(leg.id); if (active) setCar(c); }
      } catch {}
      try {
        if ((leg.type||'').toLowerCase() === 'flight') { const f = await getFlightDetails(leg.id); if (active) setFlight(f); }
      } catch {}
    })(); return () => { active = false; };
  }, [leg]);
  const formatDrivingTime = (seconds) => {
    if (seconds == null) return null;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <Popup title={`Leg: ${leg.name || getTransportTypeLabel(leg.type)} ${startName} → ${endName}`} onClose={onClose}>
      <Flex gap={3} align="center" style={{ marginBottom: '0.75rem' }}>
        {leg.date && <Badge variant="primary">{leg.date}</Badge>}
      </Flex>
      {/* Universal distance + driving time (if car) summary */}
      {(() => {
        const isCar = (leg.type || '').toLowerCase() === 'car';
        const drivingTime = car?.driving_time_seconds;
        if (leg.miles != null || (isCar && drivingTime != null)) {
          return (
            <div style={{ marginBottom: '0.75rem' }}>
              {leg.miles != null && (
                <Text variant="muted" size="sm" style={{ display: 'block' }}>Miles: {leg.miles} mi</Text>
              )}
              {isCar && drivingTime != null && (
                <Text variant="muted" size="sm" style={{ display: 'block' }}>Driving Time: {formatDrivingTime(drivingTime)}</Text>
              )}
            </div>
          );
        }
        return null;
      })()}
      {(startNode?.osm_id || endNode?.osm_id) && (
        <div style={{ marginBottom: '0.75rem' }}>
          {startNode?.osm_id && (
            <Text variant="muted" size="xs" style={{ display: 'block' }}>
              <Link to={getPlaceLink(startNode.osm_id, startNode.osm_name)} target="_blank" rel="noopener noreferrer">
                Start Location: (OSM: {startNode.osm_name || startNode.osm_id})
              </Link>
            </Text>
          )}
          {endNode?.osm_id && (
            <Text variant="muted" size="xs" style={{ display: 'block' }}>
              <Link to={getPlaceLink(endNode.osm_id, endNode.osm_name)} target="_blank" rel="noopener noreferrer">
                End Location: (OSM: {endNode.osm_name || endNode.osm_id})
              </Link>
            </Text>
          )}
        </div>
      )}
      {leg.description && <Text variant="secondary" size="sm" style={{ display: 'block', whiteSpace: 'pre-wrap', marginBottom: leg.notes ? '0.75rem' : '0' }}>{leg.description}</Text>}
      {leg.notes && <Text variant="muted" size="sm" style={{ display: 'block', whiteSpace: 'pre-wrap', marginBottom: (car || flight || (photos && photos.length)) ? '0.75rem' : 0 }}><strong>Notes:</strong> {leg.notes}</Text>}
      {flight && (
        <div style={{ marginBottom: '0.75rem' }}>
          <Text variant="secondary" size="sm" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Flight Details</Text>
          {flight.flight_number && <Text variant="muted" size="sm" style={{ display: 'block' }}>Flight #: {flight.flight_number}</Text>}
          {flight.airline && <Text variant="muted" size="sm" style={{ display: 'block' }}>Airline: {flight.airline}</Text>}
          {flight.departure_airport && <Text variant="muted" size="sm" style={{ display: 'block' }}>From: {flight.departure_airport}</Text>}
          {flight.arrival_airport && <Text variant="muted" size="sm" style={{ display: 'block' }}>To: {flight.arrival_airport}</Text>}
          {flight.duration_minutes != null && <Text variant="muted" size="sm" style={{ display: 'block' }}>Duration: {flight.duration_minutes} min</Text>}
          {flight.distance_miles != null && <Text variant="muted" size="sm" style={{ display: 'block' }}>Distance: {flight.distance_miles} mi</Text>}
        </div>
      )}
      {photos && photos.length > 0 && (
        <div style={{ marginTop: '0.25rem' }}>
          <PhotoSlideshowLarge photos={photos} />
        </div>
      )}
    </Popup>
  );
};
export default LegPopup;
