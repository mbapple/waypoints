import React, { useEffect, useState } from 'react';
import Popup from '../../common/Popup';
import { Text, Flex, Badge } from '../../../styles/components';
import { getPlaceLink } from '../../map-integration-components';
import { Link } from 'react-router-dom';
import PhotoSlideshowLarge from '../../photos/PhotoSlideshowLarge';
import { listPhotosByNode } from '../../../api/photos';
import OtherVisits from '../OtherVisits';

// Shows node info, photos, and other trips sharing this OSM feature
const NodePopup = ({ node, onClose, currentTripId, onPhotosChanged }) => {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (!node) return;
    let active = true;
    (async () => {
      try { const ph = await listPhotosByNode(node.id); if (active) setPhotos(ph || []); } catch {}
    })();
    return () => { active = false; };
  }, [node]);

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
            <PhotoSlideshowLarge photos={photos} expandable onPhotoRemoved={onPhotosChanged && ((p) => { setPhotos(ps => ps.filter(x => x.id !== p.id)); onPhotosChanged(); })} />
        </div>
      )}
      <OtherVisits osmId={node.osm_id} currentTripId={node.trip_id ?? currentTripId} />
    </Popup>
  );
};

export default NodePopup;
