import React, { useEffect, useState } from 'react';
import Popup from '../../common/Popup';
import { Text, Flex, Badge, Select } from '../../../styles/components';
import { getPlaceLink } from '../../map-integration-components';
import { Link } from 'react-router-dom';
import PhotoSlideshowLarge from '../../photos/PhotoSlideshowLarge';
import { listPhotosByNode } from '../../../api/photos';
import { getTripsByOsm } from '../../../api/trips';

// Shows node info, photos, and other trips sharing this OSM feature
const NodePopup = ({ node, onClose, currentTripId }) => {
  const [photos, setPhotos] = useState([]);
  const [otherTrips, setOtherTrips] = useState([]); // all trips from API
  const [selectedTripId, setSelectedTripId] = useState(String(currentTripId));

  useEffect(() => {
    if (!node) return;
    let active = true;
    (async () => {
      try { const ph = await listPhotosByNode(node.id); if (active) setPhotos(ph || []); } catch {}
      try {
        if (node.osm_id) {
          const trips = await getTripsByOsm(node.osm_id);
          if (active) setOtherTrips(trips || []);
        }
      } catch {}
    })();
    return () => { active = false; };
  }, [node]);

  const visibleTrips = otherTrips.filter(t => t.id !== currentTripId);

  return (
    <Popup title={`Location: ${node.name}`} onClose={onClose}>
      <Flex gap={3} align="center" style={{ marginBottom: '0.75rem' }}>
        {node.arrival_date && <Badge variant="primary">{node.arrival_date}</Badge>}
        {node.arrival_date && node.departure_date && node.arrival_date !== node.departure_date && <Text>→</Text>}
        {node.departure_date && <Badge variant="primary">{node.departure_date}</Badge>}
      </Flex>
      {node.osm_id && (
        <Link to={getPlaceLink(node.osm_id, node.osm_name)} target="_blank" rel="noopener noreferrer">
          <Text variant="muted" size="sm"><strong>OSM:</strong> {node.osm_name || node.osm_id}</Text>
        </Link>
      )}
      {node.description && (
        <Text variant="secondary" size="sm" style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: '0.75rem', marginBottom: node.notes ? '0.75rem' : '0' }}>{node.description}</Text>
      )}
      {node.notes && (
        <Text variant="muted" size="sm" style={{ display: 'block', whiteSpace: 'pre-wrap', marginBottom: photos && photos.length ? '0.75rem' : 0 }}><strong>Notes:</strong> {node.notes}</Text>
      )}
      {photos && photos.length > 0 && (
        <div style={{ marginTop: '0.25rem' }}>
            <PhotoSlideshowLarge photos={photos} />
        </div>
      )}
      {visibleTrips.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <Text variant="secondary" size="sm" style={{ display: 'block', marginBottom: '0.25rem' }}>Other trips with this location</Text>
          <Select value={selectedTripId} onChange={e => setSelectedTripId(e.target.value)}>
            <option value={currentTripId}>Current Trip</option>
            {visibleTrips.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.start_date} → {t.end_date})</option>
            ))}
          </Select>
          {String(selectedTripId) !== String(currentTripId) && (
            <div style={{ marginTop: '0.5rem' }}>
              <Link to={`/trip/${selectedTripId}`}>Go to selected trip →</Link>
            </div>
          )}
        </div>
      )}
    </Popup>
  );
};

export default NodePopup;
