import React, { useEffect, useState } from "react";
import { Button, Input, Form, FormGroup, Label, Text } from "../../styles/components";

export default function TripForm({
  initialValues = { name: "", startDate: "", endDate: "", description: "" },
  onSubmit,
  onCancel,
  submitLabel = "Save",
  saving = false,
  header,
  helper,
}) {
  const [formData, setFormData] = useState(initialValues);

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {header}
      {helper && <Text variant="secondary">{helper}</Text>}
      <FormGroup>
        <Label htmlFor="name">Trip Name *</Label>
        <Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="startDate">Start Date *</Label>
        <Input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="endDate">End Date *</Label>
        <Input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleChange} required min={formData.startDate} />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" as="textarea" rows={4} value={formData.description} onChange={handleChange} />
      </FormGroup>
      <div style={{ display: 'flex', gap: 12 }}>
        {onCancel && (<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>)}
        <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : submitLabel}</Button>
      </div>
    </Form>
  );
}
