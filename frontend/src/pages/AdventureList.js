import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Card, Button, Text, Grid, Flex, Badge } from '../styles/components';
import { listAdventures } from '../api/adventures';
import { listPhotosByAdventure } from '../api/photos';
import PhotoSlideshowLarge from '../components/photos/PhotoSlideshowLarge';
import MapView from '../components/MapView';

const PageHeader = styled.div`
  margin: ${p => p.theme.space[8]} 0 ${p => p.theme.space[6]} 0;
  text-align: center;
`;

const AdventureCard = styled(Card)`
  transition: ${p => p.theme.transitions.base};
  cursor: pointer;
  &:hover { transform: translateY(-2px); box-shadow: ${p => p.theme.shadows.xl}; }
`;

export default function AdventureList() {
  const [adventures, setAdventures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adventurePhotos, setAdventurePhotos] = useState({}); // id -> photos array (slice)
  const [imageHeight, setImageHeight] = useState(200);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setImageHeight(150); else setImageHeight(200);
    };
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

  if (loading) {
    return (
      <div>
        <PageHeader><h1>Adventures</h1><Text variant="muted">Loading...</Text></PageHeader>
      </div>
    );
  }

  return (
    <div>
      <PageHeader><h1>Adventures</h1></PageHeader>
      {adventures.length > 0 && (
        <div style={{ height: 350, marginBottom: '2rem' }}>
          <MapView
            adventureMarkers={adventures.filter(a => a.latitude && a.longitude).map(a => ({ id: a.id, pos: [a.latitude, a.longitude], name: a.name, category: a.category, start_date: a.start_date, end_date: a.end_date, notes: a.notes }))}
            bounds={(() => { const pts = adventures.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude]); return pts.length ? pts : undefined; })()}
            highlightMode="off"
          />
        </div>
      )}
      <Flex justify="space-between" align="center" style={{ marginBottom: '2rem' }}>
        <Text variant="muted">{adventures.length} {adventures.length === 1 ? 'adventure' : 'adventures'}</Text>
        <Button as={Link} to="/adventures/create" variant="primary">+ Add Adventure</Button>
      </Flex>
      <Grid columns={2}>
        {adventures.map(a => (
          <AdventureCard
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/adventures/view?adventureID=${a.id}`)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/adventures/view?adventureID=${a.id}`); } }}
          >
            {adventurePhotos[a.id] && adventurePhotos[a.id].length > 0 && (
              <div
                style={{ marginBottom: '0.75rem' }}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
              >
                <PhotoSlideshowLarge photos={adventurePhotos[a.id]} image_height={imageHeight} />
              </div>
            )}
            <h3 style={{ marginBottom: 4 }}>
              <Link to={`/adventures/view?adventureID=${a.id}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none', color: 'inherit' }}>{a.name}</Link>
            </h3>
            <div style={{ marginBottom: 8 }}>
              {a.start_date && <Badge variant="primary">{a.start_date}</Badge>} {a.end_date && <><Text variant="muted" style={{ margin: '0 4px' }}>→</Text><Badge variant="primary">{a.end_date}</Badge></>}
            </div>
            {a.category && <Badge variant="outline">{a.category}</Badge>}
          </AdventureCard>
        ))}
      </Grid>
    </div>
  );
}
