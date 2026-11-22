import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { getAdventure } from '../api/adventures';
import { listPhotosByAdventure } from '../api/photos';
import { PageHeader } from '../components/page-components';
import { Card, Text, Button, Flex, Badge } from '../styles/components';
import PhotoSlideshowLarge from '../components/photos/PhotoSlideshowLarge';
import MapView from '../components/MapView';
import { getPlaceLink } from '../components/map-integration-components';
import { MetaLine, MetaItem, PillRow, CalendarIcon, PinIcon } from '../components/common/MediaCard';
import { formatDateRange } from '../utils/format';

const Section = styled.div`
  margin-bottom: ${p => p.theme.space[4]};
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: ${p => (p.$withMap ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr')};
  gap: ${p => p.theme.space[4]};
  align-items: stretch;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    gap: ${p => p.theme.space[3]};
  }
`;

const DetailCard = styled(Card)`
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.space[2]};

  &:hover {
    border-color: ${p => p.theme.colors.border};
    box-shadow: ${p => p.theme.shadows.sm};
  }

  h2 {
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0;
  }
`;

const Notes = styled.p`
  margin: 0;
  white-space: pre-wrap;
  color: ${p => p.theme.colors.text};
`;

const MapFrame = styled.div`
  min-height: 280px;
  height: 100%;
  border-radius: ${p => p.theme.radii.xl};
  overflow: hidden;
  border: 1px solid ${p => p.theme.colors.border};

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    height: 240px;
    min-height: 0;
  }
`;

export default function AdventureDetails() {
  const params = new URLSearchParams(window.location.search);
  const adventureID = params.get('adventureID');
  const navigate = useNavigate();
  const [adventure, setAdventure] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageHeight, setImageHeight] = useState(420);

  useEffect(() => {
    const handleResize = () => setImageHeight(window.innerWidth < 768 ? 260 : 420);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { (async () => {
    if (!adventureID) return;
    try {
      const [a, p] = await Promise.all([
        getAdventure(adventureID),
        listPhotosByAdventure(adventureID).catch(() => [])
      ]);
      setAdventure(a);
      setPhotos(p);
    } catch (e) { console.error(e); alert('Failed to load adventure'); }
    finally { setLoading(false); }
  })(); }, [adventureID]);

  if (loading) return <div><PageHeader><Text variant='muted'>Loading adventure...</Text></PageHeader></div>;
  if (!adventure) return <div><PageHeader><Text variant='danger'>Adventure not found</Text></PageHeader></div>;

  const hasCoords = Boolean(adventure.latitude && adventure.longitude);
  const place = [adventure.osm_state, adventure.osm_country].filter(Boolean).join(', ');

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" gap={3} wrap>
          <div style={{ minWidth: 0 }}>
            <h1>{adventure.name}</h1>
            <MetaLine>
              {(adventure.start_date || adventure.end_date) && (
                <MetaItem><CalendarIcon />{formatDateRange(adventure.start_date, adventure.end_date)}</MetaItem>
              )}
              {place && <MetaItem><PinIcon />{place}</MetaItem>}
              {adventure.category && <Badge variant="primary">{adventure.category}</Badge>}
            </MetaLine>
          </div>
          <Flex gap={2}>
            <Button variant="outline" onClick={() => navigate('/adventures')}>← Back</Button>
            <Button variant="primary" onClick={() => navigate(`/adventures/update?adventureID=${adventure.id}`)}>Edit</Button>
          </Flex>
        </Flex>
      </PageHeader>

      {photos && photos.length > 0 && (
        <Section>
          <PhotoSlideshowLarge photos={photos} image_height={imageHeight} />
        </Section>
      )}

      <DetailGrid $withMap={hasCoords}>
        <DetailCard>
          <h2>Details</h2>
          {adventure.notes ? (
            <Notes>{adventure.notes}</Notes>
          ) : (
            <Text variant="muted" size="sm">No notes.</Text>
          )}
          {(adventure.osm_id || adventure.osm_name) ? (
            <Text variant="muted" size="sm">
              <strong>Location:</strong>{' '}
              <a href={getPlaceLink(adventure.osm_id, adventure.osm_name)} target="_blank" rel="noopener noreferrer">
                {adventure.osm_name || 'OpenStreetMap'}
              </a>
            </Text>
          ) : (
            <Text variant="muted" size="sm">No OSM metadata.</Text>
          )}
          {hasCoords && (
            <Text variant="muted" size="sm">Lat {adventure.latitude} / Lng {adventure.longitude}</Text>
          )}
          {(adventure.osm_country || adventure.osm_state) && (
            <PillRow>
              {adventure.osm_country && <Badge variant="outline">{adventure.osm_country}</Badge>}
              {adventure.osm_state && <Badge variant="outline">{adventure.osm_state}</Badge>}
            </PillRow>
          )}
        </DetailCard>

        {hasCoords && (
          <MapFrame>
            <MapView
              adventureMarkers={[{ id: adventure.id, pos: [adventure.latitude, adventure.longitude], name: adventure.name, category: adventure.category, start_date: adventure.start_date, end_date: adventure.end_date, notes: adventure.notes }]}
              bounds={[[adventure.latitude, adventure.longitude]]}
              highlightMode="off"
            />
          </MapFrame>
        )}
      </DetailGrid>
    </div>
  );
}
