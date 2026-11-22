import React, { useEffect, useState } from 'react';
import Popup from '../../common/Popup';
import { Text, Flex, Badge } from '../../../styles/components';
import { getPlaceLink } from '../../map-integration-components';
import { Link } from 'react-router-dom';
import PhotoSlideshowLarge from '../../photos/PhotoSlideshowLarge';
import { listPhotosByStop } from '../../../api/photos';
import OtherVisits from '../OtherVisits';

const StopPopup = ({ stop, onClose, onPhotosChanged }) => {
  const [photos, setPhotos] = useState([]);
  useEffect(() => { if (!stop) return; let active = true; (async () => { try { const ph = await listPhotosByStop(stop.id); if (active) setPhotos(ph || []); } catch {} })(); return () => { active = false; }; }, [stop]);
  return (
    <Popup title={`Stop: ${stop.name}`} onClose={onClose}>
      <Flex gap={3} align="center" style={{ marginBottom: '0.75rem' }}>
        {(stop.start_date || stop.end_date) && (
          <Badge variant="primary">
            {stop.start_date && stop.end_date && stop.start_date !== stop.end_date
              ? `${stop.start_date} – ${stop.end_date}`
              : (stop.start_date || stop.end_date)}
          </Badge>
        )}
        {stop.category && <Badge variant="info">{stop.category}</Badge>}
      </Flex>
      {stop.osm_id && (
        <Link to={getPlaceLink(stop.osm_id, stop.osm_name)} target="_blank" rel="noopener noreferrer">
          <Text variant="muted" size="sm"><strong>OSM:</strong> {stop.osm_name || stop.osm_id}</Text>
        </Link>
      )}
      {stop.notes && <Text variant="muted" size="sm" style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: '0.5rem', marginBottom: photos && photos.length ? '0.75rem' : 0 }}><strong>Notes:</strong> {stop.notes}</Text>}
      {photos && photos.length > 0 && (
        <div style={{ marginTop: '0.25rem' }}>
          <PhotoSlideshowLarge photos={photos} expandable onPhotoRemoved={onPhotosChanged && ((p) => { setPhotos(ps => ps.filter(x => x.id !== p.id)); onPhotosChanged(); })} />
        </div>
      )}
      <OtherVisits osmId={stop.osm_id} currentTripId={stop.trip_id} />
    </Popup>
  );
};
export default StopPopup;
