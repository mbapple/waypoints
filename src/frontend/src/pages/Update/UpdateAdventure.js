import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormCard, DangerZone } from '../../components/input-components';
import { PageHeader } from '../../components/page-components';
import { Button, Text, Flex } from '../../styles/components';
import AdventureForm from '../../components/forms/AdventureForm';
import ConfirmDeleteButton from '../../components/common/ConfirmDeleteButton';
import { getAdventure, updateAdventure, deleteAdventure } from '../../api/adventures';
import { uploadPhoto, listPhotosByAdventure } from '../../api/photos';

export default function UpdateAdventure() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const adventureID = params.get('adventureID');
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]);

  useEffect(() => { (async () => {
    try {
      if (!adventureID) return;
  const data = await getAdventure(adventureID);
      setFormData({
        name: data.name || '',
        category: data.category || '',
        notes: data.notes || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        osmName: data.osm_name || '',
        osmID: data.osm_id || '',
        osmCountry: data.osm_country || '',
        osmState: data.osm_state || '',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
      });
  // load existing photos
  try { const ph = await listPhotosByAdventure(adventureID); setPhotos(ph); } catch {}
    } catch (e) { console.error(e); alert('Failed to load adventure'); }
    finally { setLoading(false); }
  })(); }, [adventureID]);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      await updateAdventure(adventureID, {
        name: data.name,
        category: data.category,
        notes: data.notes || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        osm_name: data.osmName || null,
        osm_id: data.osmID || null,
        osm_country: data.osmCountry || null,
        osm_state: data.osmState || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      });
      navigate('/adventures');
    } catch (e) { console.error(e); alert('Failed to update adventure'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await deleteAdventure(adventureID); navigate('/adventures'); }
    catch (e) { console.error(e); alert('Failed to delete adventure'); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('adventure_id', adventureID);
      await uploadPhoto(fd);
      // refresh photos
      try { const ph = await listPhotosByAdventure(adventureID); setPhotos(ph); } catch {}
    } catch (err) {
      console.error(err); alert('Upload failed');
    } finally {
      setUploading(false);
      // reset input so same file can be re-selected
      e.target.value = '';
    }
  };

  if (loading || !formData) {
    return <div><PageHeader><Text variant='muted'>Loading adventure...</Text></PageHeader></div>;
  }

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Update Adventure</h1>
            <Text variant="secondary" size="lg">Edit details for this adventure</Text>
          </div>
          <Button variant="outline" onClick={() => navigate('/adventures')}>← Back</Button>
        </Flex>
      </PageHeader>
      <FormCard>
        <AdventureForm initialValues={formData} onSubmit={handleSubmit} onCancel={() => navigate('/adventures')} submitLabel={saving ? 'Saving...' : 'Save Changes'} saving={saving} />
      </FormCard>
      <FormCard style={{ marginTop: '1.5rem' }}>
        <Flex justify="space-between" align="center" wrap style={{ gap: '1rem' }}>
          <div>
            <Text weight="semibold">Photos</Text>
            <Text variant="muted" size="sm">Upload a photo for this adventure</Text>
          </div>
          <div>
            <label style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
              <Button as="span" variant="primary" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload Photo'}</Button>
            </label>
          </div>
        </Flex>
        {photos && photos.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
            {photos.map(p => (
              <img key={p.id} src={p.url} alt={p.description || ''} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, background: '#0f172a' }} />
            ))}
          </div>
        )}
        {photos && photos.length === 0 && !uploading && (
          <Text variant="muted" size="sm" style={{ marginTop: '0.75rem' }}>No photos yet.</Text>
        )}
      </FormCard>
      <DangerZone>
        <Text variant="danger" size="lg" style={{ marginBottom: '1rem' }}>Deleting is permanent.</Text>
        <ConfirmDeleteButton onConfirm={handleDelete}>Delete Adventure</ConfirmDeleteButton>
      </DangerZone>
    </div>
  );
}
