import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/page-components';
import { FormCard } from '../../components/input-components';
import { Button, Flex, Text } from '../../styles/components';
import ListForm from '../../components/forms/ListForm';
import { createList } from '../../api/lists';

export default function AddList() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const initialValues = { name: '', match_type: 'name', items: '' };

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
  await createList({ name: data.name, match_type: data.match_type, items: data.items });
  navigate('/statistics');
    } catch (e) {
      console.error(e); alert('Failed to create list');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Add List</h1>
            <Text variant="secondary" size="lg">Create a new tracking list</Text>
          </div>
          <Button variant="outline" onClick={() => navigate('/statistics')}>← Back</Button>
        </Flex>
      </PageHeader>
      <FormCard>
  <ListForm initialValues={initialValues} onSubmit={handleSubmit} onCancel={() => navigate('/statistics')} submitLabel={saving ? 'Creating...' : 'Create List'} saving={saving} />
      </FormCard>
    </div>
  );
}
