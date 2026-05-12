import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormCard } from '../../components/input-components';
import { PageHeader } from '../../components/page-components';
import { Button, Text, Flex } from '../../styles/components';
import AdventureForm from '../../components/forms/AdventureForm';
import { createAdventure } from '../../api/adventures';

export default function AddAdventure() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const initialValues = { name: '', category: '', notes: '', start_date: '', end_date: '', osmName: '', osmID: '', osmCountry: '', osmState: '' };

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      await createAdventure({
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
    } catch (e) {
      console.error(e); alert('Failed to create adventure');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Add Adventure</h1>
            <Text variant="secondary" size="lg">Log a single-day local adventure</Text>
          </div>
          <Button variant="outline" onClick={() => navigate('/adventures')}>← Back</Button>
        </Flex>
      </PageHeader>
      <FormCard>
        <AdventureForm initialValues={initialValues} onSubmit={handleSubmit} onCancel={() => navigate('/adventures')} submitLabel={saving ? 'Creating...' : 'Create Adventure'} saving={saving} />
      </FormCard>
    </div>
  );
}
