import React, { useEffect, useState } from 'react';
import { Form, FormGroup, Label, Input, Select, Button, Text } from '../../styles/components';

const MATCH_TYPES = [
  { value: 'name', label: 'Name (Stop/Node/Adventure Name)' },
  { value: 'osm_name', label: 'OSM Name' },
  { value: 'osm_id', label: 'OSM ID' },
  { value: 'osm_country', label: 'OSM Country (country code/name)' },
  { value: 'osm_state', label: 'OSM State/Region' },
  { value: 'date', label: 'Month (e.g. January 2025, 2025-01)' }
];

export default function ListForm({
  initialValues = { name: '', match_type: 'name', items: '' },
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  saving = false,
  header,
  helper,
}) {
  const [formData, setFormData] = useState(initialValues);

  useEffect(() => { setFormData(initialValues); }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => { e.preventDefault(); onSubmit?.(formData); };

  return (
    <Form onSubmit={handleSubmit}>
      {header}
      {helper && <Text variant="secondary">{helper}</Text>}

      <FormGroup>
        <Label htmlFor="name">List Name *</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="match_type">Match Type *</Label>
        <Select id="match_type" name="match_type" value={formData.match_type} onChange={handleChange} required>
          {MATCH_TYPES.map(mt => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
        </Select>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="items">Items (comma or newline separated)</Label>
        <Input id="items" name="items" as="textarea" rows={6} placeholder="E.g. January 2025, February 2025" value={formData.items} onChange={handleChange} />
      </FormGroup>

      <div style={{ display: 'flex', gap: 12 }}>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : submitLabel}</Button>
      </div>
    </Form>
  );
}
