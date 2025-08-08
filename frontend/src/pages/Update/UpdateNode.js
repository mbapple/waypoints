import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, Input, Form, FormGroup, Label, Text, Flex } from "../../styles/components";
import { PageHeader } from "../../components/page-components";
import { FormCard, ButtonGroup } from "../../components/input-components";
import { useParams, Link } from "react-router-dom";
import { PlaceSearchInput } from "../../components/map-integration-components";

function UpdateNode() {
  const { tripID } = useParams();
  const params = new URLSearchParams(window.location.search);
  const nodeID = params.get("nodeID");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    arrivalDate: "",
    departureDate: "",
    notes: "",
    latitude: "",
    longitude: "",
    osmName: "",
    osmID: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadNode = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/api/nodes/${nodeID}`);
        const n = res.data;
        setFormData({
          name: n.name || "",
          description: n.description || "",
          arrivalDate: n.arrival_date || "",
          departureDate: n.departure_date || "",
          notes: n.notes || "",
          latitude: n.latitude || "",
          longitude: n.longitude || "",
          osmName: n.osm_name || "",
          osmID: n.osm_id || "",
        });
      } catch (e) {
        console.error(e);
        alert("Failed to load node.");
      } finally {
        setLoading(false);
      }
    };
    if (nodeID) loadNode();
  }, [nodeID]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        trip_id: parseInt(tripID, 10),
        description: formData.description || null,
        arrival_date: formData.arrivalDate || null,
        departure_date: formData.departureDate || null,
        notes: formData.notes || null,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        osm_name: formData.osmName || null,
        osm_id: formData.osmID || null,
      };
      await axios.put(`http://localhost:3001/api/nodes/${nodeID}`, payload);
      window.location.href = `/trip/${tripID}`;
    } catch (err) {
      console.error(err);
      alert("Failed to update node.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader>
          <Text variant="muted">Loading node...</Text>
        </PageHeader>
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Update Destination</h1>
            <Text variant="secondary" size="lg">
              Modify details for this destination
            </Text>
          </div>
          <Button as={Link} to={`/trip/${tripID}`} variant="outline">
            ← Back to Trip
          </Button>
        </Flex>
      </PageHeader>

      <FormCard>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">Location Name *</Label>
            <Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="location">Location *</Label>
            <PlaceSearchInput
              id="location"
              name="location"
              placeholder="Search for a location..."
              onPlaceSelect={(place) => {
                setFormData(prev => ({
                  ...prev,
                  latitude: place.lat,
                  longitude: place.lon,
                  osmName: place.name,
                  osmID: place.osm_id
                }));
              }}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" type="text" value={formData.description} onChange={handleChange} />
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
            <Input id="notes" name="notes" as="textarea" rows={4} value={formData.notes} onChange={handleChange} style={{ resize: 'vertical', minHeight: '100px' }} />
          </FormGroup>

          <ButtonGroup>
            <Button as={Link} to={`/trip/${tripID}`} variant="outline">Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </ButtonGroup>
        </Form>
      </FormCard>
    </div>
  );
}

export default UpdateNode;
