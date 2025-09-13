import React, { useEffect, useState } from "react";
import { Form, FormGroup, Label, Input, Select, Button } from "../../styles/components";
import { PlaceSearchInput } from "../map-integration-components";
import { placeToOsmFields } from "../../utils/places";
import { getTransportTypeLabel } from "../../utils/format";

export default function StopForm({
  nodes = [],
  legs = [],
  initialValues = {
    name: "",
    legID: "",
    nodeID: "",
    category: "",
    notes: "",
    latitude: "",
    longitude: "",
    osmName: "",
    osmID: "",
    osmCountry: "",
    osmState: "",
    date: "",
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

  // Sync when initialValues changes (e.g., after async fetch on update page)
  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      setCatLoading(true); setCatError(null);
      try {
        const mod = await import('../../api/stop_categories');
        const data = await mod.getStopCategories();
        if (!cancelled) {
          setCategories(data);
        }
      } catch (e) {
        if (!cancelled) setCatError(e.message || 'Failed to load categories');
      } finally {
        if (!cancelled) setCatLoading(false);
      }
    };
    loadCategories();
    return () => { cancelled = true; };
  }, []);

  const getNodeName = (nodeID) => {
    const node = nodes.find(n => n.id === nodeID);
    return node ? node.name : `Node ${nodeID}`;
  };



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectAssociation = (e) => {
    const value = e.target.value;
    if (value.startsWith('leg-')) {
      setFormData(prev => ({ ...prev, legID: value.replace('leg-', ''), nodeID: null }));
    } else if (value.startsWith('node-')) {
      setFormData(prev => ({ ...prev, nodeID: value.replace('node-', ''), legID: null }));
    } else {
      setFormData(prev => ({ ...prev, legID: null, nodeID: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormGroup>
        <Label htmlFor="name">Stop Name *</Label>
        <Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="association">Associate this stop to either a Leg or a Node *</Label>
        <Select id="association" name="association" required value={(formData.legID ? `leg-${formData.legID}` : (formData.nodeID ? `node-${formData.nodeID}` : ""))} onChange={handleSelectAssociation}>
          <option value="">Select Leg or Node</option>
          {legs.map(leg => (
            <option key={`leg-${leg.id}`} value={`leg-${leg.id}`}>
              Leg: {leg.name || `${getTransportTypeLabel(leg.type)} ${getNodeName(leg.start_node_id)} to ${getNodeName(leg.end_node_id)}`}
            </option>
          ))}
          {nodes.map(node => (
            <option key={`node-${node.id}`} value={`node-${node.id}`}>
              Node: {node.name}
            </option>
          ))}
        </Select>
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
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="category">Category *</Label>
        <Select id="category" name="category" value={formData.category} onChange={handleChange} required disabled={catLoading || !!catError}>
          <option value="">{catLoading ? 'Loading categories...' : (catError ? 'Error loading categories' : 'Select category')}</option>
          {categories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </Select>
        {catError && <div style={{ color: '#f66', fontSize: 12, marginTop: 4 }}>{catError}</div>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" as="textarea" rows={4} value={formData.notes} onChange={handleChange} placeholder="Any additional notes about this stop..." />
      </FormGroup>

      <div style={{ display: 'flex', gap: 12 }}>
        {onCancel && (<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>)}
        <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : submitLabel}</Button>
      </div>
    </Form>
  );
}
