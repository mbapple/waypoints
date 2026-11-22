import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Popup from '../../common/Popup';
import { Text, Flex, Badge } from '../../../styles/components';
import { Link } from 'react-router-dom';
import { getPlaceLink } from '../../map-integration-components';
import PhotoSlideshowLarge from '../../photos/PhotoSlideshowLarge';
import { getTransportTypeLabel } from '../../../utils/format';
import { getCarDetails, getFlightDetails } from '../../../api/legs';
import { aircraftLabel } from '../../../utils/aircraftTypes';
import AircraftPhoto from '../../flights/AircraftPhoto';

const Section = styled.section`
  & + & {
    margin-top: ${(p) => p.theme.space[4]};
    padding-top: ${(p) => p.theme.space[4]};
    border-top: 1px solid ${(p) => p.theme.colors.border};
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 ${(p) => p.theme.space[2]};
  font-size: ${(p) => p.theme.fontSizes.base};
  color: ${(p) => p.theme.colors.text};
`;

const formatDrivingTime = (seconds) => {
  if (seconds == null) return null;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const legLabel = (leg, startNode, endNode) =>
  `${leg.name || getTransportTypeLabel(leg.type)} ${startNode?.name || 'Start'} → ${endNode?.name || 'End'}`;

// Details of one leg; `title` is set when several legs share the popup.
function LegSection({ leg, startNode, endNode, photos = [], title, onPhotosChanged }) {
  const [car, setCar] = useState(null);
  const [flight, setFlight] = useState(null);
  useEffect(() => {
    if (!leg) return; let active = true; (async () => {
      try {
        if (['car','bus'].includes((leg.type||'').toLowerCase())) { const c = await getCarDetails(leg.id); if (active) setCar(c); }
      } catch {}
      try {
        if ((leg.type||'').toLowerCase() === 'flight') { const f = await getFlightDetails(leg.id); if (active) setFlight(f); }
      } catch {}
    })(); return () => { active = false; };
  }, [leg]);

  const isCar = (leg.type || '').toLowerCase() === 'car';
  const drivingTime = car?.driving_time_seconds;

  return (
    <Section>
      {title && <SectionTitle>{title}</SectionTitle>}
      {leg.date && (
        <Flex gap={3} align="center" style={{ marginBottom: '0.75rem' }}>
          <Badge variant="primary">{leg.date}</Badge>
        </Flex>
      )}
      {(leg.miles != null || (isCar && drivingTime != null)) && (
        <div style={{ marginBottom: '0.75rem' }}>
          {leg.miles != null && (
            <Text variant="muted" size="sm" style={{ display: 'block' }}>Miles: {leg.miles} mi</Text>
          )}
          {isCar && drivingTime != null && (
            <Text variant="muted" size="sm" style={{ display: 'block' }}>Driving Time: {formatDrivingTime(drivingTime)}</Text>
          )}
        </div>
      )}
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
          {flight.start_airport && <Text variant="muted" size="sm" style={{ display: 'block' }}>From: {flight.start_airport}</Text>}
          {flight.end_airport && <Text variant="muted" size="sm" style={{ display: 'block' }}>To: {flight.end_airport}</Text>}
          {aircraftLabel(flight) && <Text variant="muted" size="sm" style={{ display: 'block' }}>Aircraft: {aircraftLabel(flight)}</Text>}
          {flight.duration_minutes != null && <Text variant="muted" size="sm" style={{ display: 'block' }}>Duration: {flight.duration_minutes} min</Text>}
          {flight.distance_miles != null && <Text variant="muted" size="sm" style={{ display: 'block' }}>Distance: {flight.distance_miles} mi</Text>}
          <Text variant="muted" size="sm" style={{ display: 'block' }}>Path: {flight.polyline ? `recorded track${flight.track_source === 'opensky' ? ' (OpenSky)' : ''}` : 'great-circle route'}</Text>
          {flight.aircraft_photo && <div style={{ marginTop: '0.5rem' }}><AircraftPhoto flight={flight} width="240px" /></div>}
        </div>
      )}
      {photos && photos.length > 0 && (
        <div style={{ marginTop: '0.25rem' }}>
          <PhotoSlideshowLarge photos={photos} expandable onPhotoRemoved={onPhotosChanged} />
        </div>
      )}
    </Section>
  );
}

/**
 * Detail popup for one leg, or for a chain of legs joined through invisible nodes
 * (Pensacola → DFW → Bonham shows as one group, with a section per leg).
 * legs: ordered leg objects; nodes: the trip's nodes; photosByLeg: Map legId → photos.
 */
const LegPopup = ({ legs, nodes = [], photosByLeg, onClose, onPhotosChanged }) => {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const startOf = (l) => nodeById.get(l.start_node_id);
  const endOf = (l) => nodeById.get(l.end_node_id);
  const photosOf = (l) => photosByLeg?.get(l.id) || [];

  if (legs.length === 1) {
    const [leg] = legs;
    return (
      <Popup title={`Leg: ${legLabel(leg, startOf(leg), endOf(leg))}`} onClose={onClose}>
        <LegSection leg={leg} startNode={startOf(leg)} endNode={endOf(leg)} photos={photosOf(leg)} onPhotosChanged={onPhotosChanged} />
      </Popup>
    );
  }

  const first = startOf(legs[0]);
  const last = endOf(legs[legs.length - 1]);
  const via = legs.slice(0, -1).map(endOf).filter(Boolean).map((n) => n.name).join(', ');
  return (
    <Popup title={`Legs: ${first?.name || 'Start'} → ${last?.name || 'End'}${via ? ` via ${via}` : ''}`} onClose={onClose}>
      {legs.map((leg) => (
        <LegSection key={leg.id} leg={leg} startNode={startOf(leg)} endNode={endOf(leg)} photos={photosOf(leg)}
          title={legLabel(leg, startOf(leg), endOf(leg))} onPhotosChanged={onPhotosChanged} />
      ))}
    </Popup>
  );
};
export default LegPopup;
