import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { getAdventure } from '../api/adventures';
import { listPhotosByAdventure } from '../api/photos';
import { PageHeader } from '../components/page-components';
import { Text, Button, Flex, Badge } from '../styles/components';
import PhotoSlideshowLarge from '../components/photos/PhotoSlideshowLarge';
import { StopCard } from '../components/trip-details/trip-detail-components';
import MapView from '../components/MapView';
import { getPlaceLink } from '../components/map-integration-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export default function AdventureDetails() {
  const params = new URLSearchParams(window.location.search);
  const adventureID = params.get('adventureID');
  const navigate = useNavigate();
  const [adventure, setAdventure] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>{adventure.name}</h1>
            <Text variant="secondary" size="lg">Adventure Details</Text>
          </div>
          <Flex gap={2} style={{ gap: '0.5rem' }}>
            <Button variant="outline" onClick={() => navigate('/adventures')}>← Back</Button>
            <Button variant="primary" onClick={() => navigate(`/adventures/update?adventureID=${adventure.id}`)}>Edit</Button>
          </Flex>
        </Flex>
      </PageHeader>

      {/* Large slideshow above detail card (mirroring TripDetails placement) */}
      {photos && photos.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <PhotoSlideshowLarge photos={photos} image_height={400} />
        </div>
      )}

      {/* Inline map for this adventure */}
      {(adventure.latitude && adventure.longitude) && (
        <div style={{ height: 360, marginBottom: '1.5rem' }}>
          <MapView
            adventureMarkers={[{ id: adventure.id, pos: [adventure.latitude, adventure.longitude], name: adventure.name, category: adventure.category, start_date: adventure.start_date, end_date: adventure.end_date, notes: adventure.notes }]}
            bounds={[[adventure.latitude, adventure.longitude]]}
            highlightMode="off"
          />
        </div>
      )}

      <Wrapper>
        <StopCard style={{ cursor: 'default' }}>
          <Flex justify="space-between" align="center">
            <h5 style={{ margin: 0 }}>
              {adventure.name}
              {adventure.category && <><span style={{ marginLeft: '0.75rem' }} /> <Badge variant="info">{adventure.category}</Badge></>}
            </h5>
            {(adventure.start_date || adventure.end_date) && (
              <Flex gap={3} align="center">
                <Badge variant="primary">
                  {adventure.start_date && adventure.end_date && adventure.start_date !== adventure.end_date
                    ? `${adventure.start_date} – ${adventure.end_date}`
                    : (adventure.start_date || adventure.end_date)}
                </Badge>
              </Flex>
            )}
          </Flex>
          <Flex justify="space-between" align="center" style={{ marginTop: '0.5rem' }}>
            {(adventure.osm_id || adventure.osm_name) ? (
              <a href={getPlaceLink(adventure.osm_id, adventure.osm_name)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <Text variant="muted" size="sm"><strong>Location:</strong> (OSM: {adventure.osm_name || 'N/A'})</Text>
              </a>
            ) : (<Text variant="muted" size="sm">No OSM metadata.</Text>)}
          </Flex>
          {adventure.notes && (
            <Text style={{ whiteSpace: 'pre-wrap', marginTop: '0.75rem' }}>{adventure.notes}</Text>
          )}
          {(adventure.latitude && adventure.longitude) && (
            <Text variant="muted" size="sm" style={{ marginTop: '0.5rem' }}>Lat: {adventure.latitude} / Lng: {adventure.longitude}</Text>
          )}
          {(adventure.osm_country || adventure.osm_state) && (
            <Flex gap={2} style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {adventure.osm_country && <Badge variant="outline">{adventure.osm_country}</Badge>}
              {adventure.osm_state && <Badge variant="outline">{adventure.osm_state}</Badge>}
            </Flex>
          )}
        </StopCard>
      </Wrapper>
    </div>
  );
}
