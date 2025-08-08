import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { FormCard } from "../../components/input-components";
import { PageHeader } from "../../components/page-components";
import { PlaceSearchInput } from "../../components/map-integration-components";
import { Button, Text, Flex, Form, FormGroup, Label, Input, Select } from "../../styles/components";

function UpdateStop() {
  const { tripID } = useParams();
  const params = new URLSearchParams(window.location.search);
  const stopID = params.get("stopID");

  const [formData, setFormData] = useState({
    name: "",
    legID: "",
    nodeID: "",
    category: "",
    notes: "",
    latitude: "",
    longitude: "",
    osmName: "",
    osmID: "",
  });

  const [nodes, setNodes] = useState([]);
  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [nodesRes, legsRes, stopRes] = await Promise.all([
          axios.get(`http://localhost:3001/api/nodes/by_trip/${tripID}`),
          axios.get(`http://localhost:3001/api/legs/by_trip/${tripID}`),
          axios.get(`http://localhost:3001/api/stops/${stopID}`)
        ]);
        setNodes(nodesRes.data);
        setLegs(legsRes.data);

        const s = stopRes.data;
        setFormData({
          name: s.name || "",
          legID: s.leg_id || "",
          nodeID: s.node_id || "",
          category: s.category || "",
          notes: s.notes || "",
          latitude: s.latitude || "",
          longitude: s.longitude || "",
          osmName: s.osm_name || "",
          osmID: s.osm_id || "",
        });
      } catch (e) {
        console.error(e);
        alert("Failed to load stop.");
      } finally {
        setLoading(false);
      }
    };
    if (stopID) load();
  }, [tripID, stopID]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`http://localhost:3001/api/stops/${stopID}`, {
        trip_id: parseInt(tripID, 10),
        name: formData.name,
        leg_id: formData.legID || null,
        node_id: formData.nodeID || null,
        category: formData.category,
        notes: formData.notes || null,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        osm_name: formData.osmName || null,
        osm_id: formData.osmID || null,
      });
      window.location.href = `/trip/${tripID}`;
    } catch (err) {
      console.error(err);
      alert("Failed to update stop. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader>
          <Text variant="muted">Loading stop...</Text>
        </PageHeader>
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Update Stop</h1>
            <Text variant="secondary" size="lg">Edit details for this stop</Text>
          </div>
          <Button as={Link} to={`/trip/${tripID}`} variant="outline">← Back to Trip</Button>
        </Flex>
      </PageHeader>

      <FormCard>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">Stop Name *</Label>
            <Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="association">Associated Leg or Node *</Label>
            <Select
              id="association"
              name="association"
              required
              value={formData.legID || formData.nodeID || ""}
              onChange={(e) => {
                const value = e.target.value;
                const selectedOption = e.target.options[e.target.selectedIndex];
                const type = selectedOption.dataset.type;

                if (type === 'leg') {
                  setFormData(prev => ({ ...prev, legID: value, nodeID: null }));
                } else if (type === 'node') {
                  setFormData(prev => ({ ...prev, nodeID: value, legID: null }));
                } else {
                  setFormData(prev => ({ ...prev, legID: null, nodeID: null }));
                }
              }}
            >
              <option value="">Select Leg or Node</option>
              {legs.map(leg => (
                <option key={`leg-${leg.id}`} value={leg.id} data-type="leg">
                  Leg: {leg.type} from {leg.start_node_name} to {leg.end_node_name}
                </option>
              ))}
              {nodes.map(node => (
                <option key={`node-${node.id}`} value={node.id} data-type="node">
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
            <Label htmlFor="category">Category *</Label>
            <Select id="category" name="category" value={formData.category} onChange={handleChange} required>
              <option value="">Select category</option>
              <option value="hotel">Hotel</option>
              <option value="restaurant">Restaurant</option>
              <option value="attraction">Attraction</option>
              <option value="park">Bus</option>
              <option value="other">Other</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" as="textarea" rows={4} value={formData.notes} onChange={handleChange} placeholder="Any additional notes about this stop..." />
          </FormGroup>

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Form>
      </FormCard>
    </div>
  );
}

export default UpdateStop;
