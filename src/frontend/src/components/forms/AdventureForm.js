import React, { useEffect, useState } from "react";
import { Form, FormGroup, Label, Input, Select, Button } from "../../styles/components";
import { PlaceSearchInput } from "../map-integration-components";
import { placeToOsmFields } from "../../utils/places";

export default function AdventureForm({
  initialValues = {
    name: "",
    category: "",
    notes: "",
    latitude: "",
    longitude: "",
    osmName: "",
    osmID: "",
    osmCountry: "",
    osmState: "",
    start_date: "",
    end_date: "",
  },
  onSubmit,
  onCancel,
  submitLabel = "Save",
  saving = false,
}) {
  const [formData, setFormData] = useState(initialValues);
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState(null);

  useEffect(() => { setFormData(initialValues); }, [initialValues]);

  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      setCatLoading(true); setCatError(null);
      try {
        const mod = await import('../../api/stop_categories');
        const data = await mod.getStopCategories();
        if (!cancelled) setCategories(data);
      } catch (e) {
        if (!cancelled) setCatError(e.message || 'Failed to load categories');
      } finally {
        if (!cancelled) setCatLoading(false);
      }
    };
    loadCategories();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => { e.preventDefault(); onSubmit?.(formData); };

  return (
    <Form onSubmit={handleSubmit}>
      <FormGroup>
        <Label htmlFor="name">Adventure Name *</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="location">Location</Label>
        <PlaceSearchInput
          id="location"
          name="location"
          placeholder="Search for a location..."
          value={formData.osmName || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, osmName: e.target.value }))}
          onPlaceSelect={(place) => setFormData(prev => ({ ...prev, ...placeToOsmFields(place) }))}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="start_date">Start Date</Label>
        <Input id="start_date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="end_date">End Date</Label>
        <Input id="end_date" name="end_date" type="date" value={formData.end_date} onChange={handleChange} />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="category">Category *</Label>
        <Select id="category" name="category" value={formData.category} onChange={handleChange} required disabled={catLoading || !!catError}>
          <option value="">{catLoading ? 'Loading categories...' : (catError ? 'Error loading categories' : 'Select category')}</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </Select>
        {catError && <div style={{ color: '#f66', fontSize: 12, marginTop: 4 }}>{catError}</div>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" as="textarea" rows={4} value={formData.notes} onChange={handleChange} placeholder="Any additional notes..." />
      </FormGroup>

      <div style={{ display: 'flex', gap: 12 }}>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : submitLabel}</Button>
      </div>
    </Form>
  );
}
