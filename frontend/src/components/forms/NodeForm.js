import React, { useEffect, useState } from "react";
import { Button, Input, Form, FormGroup, Label, Flex, CheckboxLabel, Checkbox } from "../../styles/components";
import { PlaceSearchInput } from "../map-integration-components";
import { placeToOsmFields } from "../../utils/places";

export default function NodeForm({
  initialValues = {
    name: "",
    description: "",
    arrivalDate: "",
    departureDate: "",
    notes: "",
    latitude: "",
    longitude: "",
    osmName: "",
    osmID: "",
    osmCountry: "",
    osmState: "",
    isInvisible: false,
  },
  onSubmit,
  onCancel,
  submitLabel = "Save",
  saving = false,
}) {
  const [formData, setFormData] = useState(initialValues);

  // Keep form in sync when initialValues prop changes (e.g., after async load)
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
      <FormGroup>
        <Label htmlFor="name">Location Name *</Label>
        <Input id="name" name="name" type="text" placeholder="e.g., Rome, Italy" value={formData.name} onChange={handleChange} required />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="location">Location *</Label>
        <PlaceSearchInput
          id="location"
          name="location"
          placeholder="Search for a location..."
          required
          value={formData.osmName || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, osmName: e.target.value }))}
          onPlaceSelect={(place) => {
            setFormData(prev => ({
              ...prev,
              ...placeToOsmFields(place)
            }));
          }}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" type="text" placeholder="Brief description of this destination" value={formData.description} onChange={handleChange} />
      </FormGroup>

      <Flex gap={4}>
        <FormGroup style={{ flex: 1 }}>
          <Label htmlFor="arrivalDate">Arrival Date *</Label>
          <Input id="arrivalDate" name="arrivalDate" type="date" value={formData.arrivalDate} onChange={handleChange} required />
        </FormGroup>

        <FormGroup style={{ flex: 1 }}>
          <Label htmlFor="departureDate">Departure Date *</Label>
          <Input id="departureDate" name="departureDate" type="date" value={formData.departureDate} onChange={handleChange} required min={formData.arrivalDate} />
        </FormGroup>
      </Flex>

      <FormGroup>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" as="textarea" rows={4} placeholder="Any additional notes about this destination..." value={formData.notes} onChange={handleChange} style={{ resize: 'vertical', minHeight: '100px' }} />
      </FormGroup>

      <CheckboxLabel>
        <Checkbox
          id="isInvisible"
          name="isInvisible"
          checked={!!formData.isInvisible}
          onChange={(e) => setFormData(prev => ({ ...prev, isInvisible: e.target.checked }))}
        />
        Make Node Invisible
      </CheckboxLabel>

      <div style={{ display: 'flex', gap: 12 }}>
        {onCancel && (<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>)}
        <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : submitLabel}</Button>
      </div>
    </Form>
  );
}
