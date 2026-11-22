import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Button, Text, Badge } from '../styles/components';
import { listAdventures } from '../api/adventures';
import { listPhotosByAdventure } from '../api/photos';
import PhotoSlideshowLarge from '../components/photos/PhotoSlideshowLarge';
import MapView from '../components/MapView';
import { ListHeader } from '../components/page-components';
import {
  CardGrid, MediaCard, MediaPlaceholder, MediaCardBody, MediaCardTitle,
  MetaLine, MetaItem, PillRow, CalendarIcon, PinIcon, MountainIcon,
} from '../components/common/MediaCard';
import { formatDateRange } from '../utils/format';

const MapFrame = styled.div`
  height: 300px;
  margin-bottom: ${p => p.theme.space[4]};
  border-radius: ${p => p.theme.radii.xl};
  overflow: hidden;
  border: 1px solid ${p => p.theme.colors.border};

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    height: 220px;
    margin-bottom: ${p => p.theme.space[3]};
  }
`;

const placeLabel = (a) => [a.osm_state, a.osm_country].filter(Boolean).join(', ') || a.osm_name || '';

export default function AdventureList() {
  const [adventures, setAdventures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adventurePhotos, setAdventurePhotos] = useState({}); // id -> photos array (slice)
  const [imageHeight, setImageHeight] = useState(220);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setImageHeight(window.innerWidth < 768 ? 200 : 220);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { (async () => { try {
      const data = await listAdventures();
      setAdventures(data);
      const photoPromises = data.map(a => listPhotosByAdventure(a.id).then(p => ({ id: a.id, photos: p.slice(0,5) })).catch(() => ({ id: a.id, photos: [] })));
      const photoResults = await Promise.all(photoPromises);
      const grouped = {};
      photoResults.forEach(r => { grouped[r.id] = r.photos; });
      setAdventurePhotos(grouped);
    } finally { setLoading(false); } })(); }, []);

  const openAdventure = (id) => navigate(`/adventures/view?adventureID=${id}`);

  if (loading) {
    return (
      <div>
        <ListHeader><div><h1>Adventures</h1><Text variant="muted">Loading...</Text></div></ListHeader>
      </div>
    );
  }

  return (
    <div>
      <ListHeader>
        <div>
          <h1>Adventures</h1>
          <Text variant="muted">{adventures.length} {adventures.length === 1 ? 'adventure' : 'adventures'}</Text>
        </div>
        <Button as={Link} to="/adventures/create" variant="primary">+ Add Adventure</Button>
      </ListHeader>
      {adventures.length > 0 && (
        <MapFrame>
          <MapView
            adventureMarkers={adventures.filter(a => a.latitude && a.longitude).map(a => ({ id: a.id, pos: [a.latitude, a.longitude], name: a.name, category: a.category, start_date: a.start_date, end_date: a.end_date, notes: a.notes }))}
            bounds={(() => { const pts = adventures.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude]); return pts.length ? pts : undefined; })()}
            highlightMode="off"
          />
        </MapFrame>
      )}
      <CardGrid>
        {adventures.map(a => {
          const photos = adventurePhotos[a.id] || [];
          const place = placeLabel(a);
          return (
            <MediaCard
              key={a.id}
              role="link"
              tabIndex={0}
              aria-label={a.name}
              onClick={() => openAdventure(a.id)}
              onKeyDown={e => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAdventure(a.id); }
              }}
            >
              {photos.length > 0 ? (
                <PhotoSlideshowLarge photos={photos} image_height={imageHeight} rounded={false} />
              ) : (
                <MediaPlaceholder $height={imageHeight}><MountainIcon size={36} /></MediaPlaceholder>
              )}
              <MediaCardBody>
                <MediaCardTitle title={a.name}>
                  <Link to={`/adventures/view?adventureID=${a.id}`} onClick={e => e.stopPropagation()} tabIndex={-1}>{a.name}</Link>
                </MediaCardTitle>
                {(a.start_date || a.end_date || place) && (
                  <MetaLine>
                    {(a.start_date || a.end_date) && (
                      <MetaItem><CalendarIcon />{formatDateRange(a.start_date, a.end_date)}</MetaItem>
                    )}
                    {place && <MetaItem><PinIcon />{place}</MetaItem>}
                  </MetaLine>
                )}
                {a.category && (
                  <PillRow><Badge variant="primary">{a.category}</Badge></PillRow>
                )}
              </MediaCardBody>
            </MediaCard>
          );
        })}
      </CardGrid>
    </div>
  );
}
