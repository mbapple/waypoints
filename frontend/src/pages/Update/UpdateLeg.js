import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { FormCard, DangerZone } from "../../components/input-components";
import { PageHeader } from "../../components/page-components";
import { Button, Text, Flex, Form, FormGroup, Label, Input, Select } from "../../styles/components";
import { PlaceSearchInput } from "../../components/map-integration-components";
import { CarDetails } from "../../components/leg-details-components";

function UpdateLeg() {
  const { tripID } = useParams();
  const params = new URLSearchParams(window.location.search);
  const legID = params.get("legID");

  const [formData, setFormData] = useState({
    type: "",
    fromNode: "",
    toNode: "",
    date: "",
    notes: "",
  start_latitude: "",
  start_longitude: "",
  end_latitude: "",
  end_longitude: "",
  start_osm_name: "",
  start_osm_id: "",
  end_osm_name: "",
  end_osm_id: "",
  miles: "",
  });

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);


  const handleDeleteLeg = async () => {
    if (!window.confirm("Are you sure you want to delete this leg? This action cannot be undone.")) {
      return;
    }
    
    setDeleting(true);
    try {
      await axios.delete(`http://localhost:3001/api/legs/${legID}`);
      window.location.href = "/";
    } catch (err) {
      alert("Failed to delete leg.");
      console.error(err);
      setDeleting(false);
    }
  };


  useEffect(() => {
    const load = async () => {
      try {
        const [nodesRes, legRes, carRes] = await Promise.all([
          axios.get(`http://localhost:3001/api/nodes/by_trip/${tripID}`),
          axios.get(`http://localhost:3001/api/legs/${legID}`),
          axios.get(`http://localhost:3001/api/car_details/${legID}`).catch(() => ({ data: null }))
        ]);
        setNodes(nodesRes.data);

        const l = legRes.data;
        setFormData({
          type: l.type || "",
          fromNode: l.start_node_id || "",
          toNode: l.end_node_id || "",
          date: l.date || "",
          notes: l.notes || "",
          start_latitude: l.start_latitude || "",
          start_longitude: l.start_longitude || "",
          end_latitude: l.end_latitude || "",
          end_longitude: l.end_longitude || "",
          start_osm_name: l.start_osm_name || "",
          start_osm_id: l.start_osm_id || "",
          end_osm_name: l.end_osm_name || "",
          end_osm_id: l.end_osm_id || "",
          miles: l.miles || "",
        });
        setCarAutoFill(carRes?.data ? { driving_time_seconds: carRes.data.driving_time_seconds, polyline: carRes.data.polyline } : null);
      } catch (e) {
        console.error(e);
        alert("Failed to load leg.");
      } finally {
        setLoading(false);
      }
    };
    if (legID) load();
  }, [tripID, legID]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`http://localhost:3001/api/legs/${legID}`, {
        trip_id: parseInt(tripID, 10),
        type: formData.type,
        start_node_id: formData.fromNode ? Number(formData.fromNode) : null,
        end_node_id: formData.toNode ? Number(formData.toNode) : null,
        notes: formData.notes || null,
        date: formData.date,
        start_latitude: formData.start_latitude ? Number(formData.start_latitude) : null,
        start_longitude: formData.start_longitude ? Number(formData.start_longitude) : null,
        end_latitude: formData.end_latitude ? Number(formData.end_latitude) : null,
        end_longitude: formData.end_longitude ? Number(formData.end_longitude) : null,
        start_osm_name: formData.start_osm_name || null,
        start_osm_id: formData.start_osm_id || null,
        end_osm_name: formData.end_osm_name || null,
        end_osm_id: formData.end_osm_id || null,
        miles: formData.miles ? Number(formData.miles) : null,
      });

      // Upsert car_details if car and we have details
      if (formData.type === 'car') {
        await axios.post("http://localhost:3001/api/car_details", {
          leg_id: Number(legID),
          driving_time_seconds: carAutoFill?.driving_time_seconds ?? null,
          polyline: carAutoFill?.polyline ?? null,
        });
      }
      window.location.href = `/trip/${tripID}`;
    } catch (err) {
      console.error(err);
      alert("Failed to update travel leg. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectedFromNode = useMemo(() => nodes.find(n => String(n.id) === String(formData.fromNode)), [nodes, formData.fromNode]);
  const selectedToNode = useMemo(() => nodes.find(n => String(n.id) === String(formData.toNode)), [nodes, formData.toNode]);
  const [carAutoFill, setCarAutoFill] = useState(null);

  useEffect(() => {
    if (selectedFromNode) {
      setFormData(prev => ({
        ...prev,
        start_latitude: prev.start_latitude || selectedFromNode.latitude || "",
        start_longitude: prev.start_longitude || selectedFromNode.longitude || "",
        start_osm_name: prev.start_osm_name || selectedFromNode.osm_name || "",
        start_osm_id: prev.start_osm_id || selectedFromNode.osm_id || "",
        date: prev.date || (selectedFromNode.departure_date || ''),
      }));
    }
  }, [selectedFromNode]);

  useEffect(() => {
    if (selectedToNode) {
      setFormData(prev => ({
        ...prev,
        end_latitude: prev.end_latitude || selectedToNode.latitude || "",
        end_longitude: prev.end_longitude || selectedToNode.longitude || "",
        end_osm_name: prev.end_osm_name || selectedToNode.osm_name || "",
        end_osm_id: prev.end_osm_id || selectedToNode.osm_id || "",
      }));
    }
  }, [selectedToNode]);

  if (loading) {
    return (
      <div>
        <PageHeader>
          <Text variant="muted">Loading leg...</Text>
        </PageHeader>
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Update Travel Leg</h1>
            <Text variant="secondary" size="lg">Edit transportation between destinations</Text>
          </div>
          <Button as={Link} to={`/trip/${tripID}`} variant="outline">← Back to Trip</Button>
        </Flex>
      </PageHeader>

      <FormCard>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="type">Transport Type *</Label>
            <Select id="type" name="type" value={formData.type} onChange={handleChange} required>
              <option value="">Select Transport Type</option>
              <option value="flight">Flight</option>
              <option value="car">Car</option>
              <option value="train">Train</option>
              <option value="bus">Bus</option>
              <option value="boat">Boat</option>
              <option value="other">Other</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="fromNode">From Node *</Label>
            <Select id="fromNode" name="fromNode" value={formData.fromNode} onChange={handleChange} required>
              <option value="">Select starting node</option>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>{node.name}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="toNode">To Node *</Label>
            <Select id="toNode" name="toNode" value={formData.toNode} onChange={handleChange} required>
              <option value="">Select destination node</option>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>{node.name}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="date">Date *</Label>
            <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} required />
          </FormGroup>

          <FormGroup>
            <Label>From Location</Label>
            <PlaceSearchInput
              placeholder="Search for a start location..."
              value={formData.start_osm_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, start_osm_name: e.target.value }))}
              onPlaceSelect={(place) => setFormData(prev => ({
                ...prev,
                start_latitude: place.lat,
                start_longitude: place.lon,
                start_osm_name: place.name,
                start_osm_id: place.osm_id,
              }))}
            />
          </FormGroup>

          <FormGroup>
            <Label>To Location</Label>
            <PlaceSearchInput
              placeholder="Search for a destination..."
              value={formData.end_osm_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, end_osm_name: e.target.value }))}
              onPlaceSelect={(place) => setFormData(prev => ({
                ...prev,
                end_latitude: place.lat,
                end_longitude: place.lon,
                end_osm_name: place.name,
                end_osm_id: place.osm_id,
              }))}
            />
          </FormGroup>

          {formData.type === 'car' && (
            <FormGroup>
              <CarDetails
                start={{ lat: Number(formData.start_latitude), lon: Number(formData.start_longitude) }}
                end={{ lat: Number(formData.end_latitude), lon: Number(formData.end_longitude) }}
                initialMiles={formData.miles ? Number(formData.miles) : undefined}
                onAutoFill={({ miles, driving_time_seconds, polyline }) => {
                  setFormData(prev => ({ ...prev, miles }));
                  setCarAutoFill({ driving_time_seconds, polyline });
                }}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label htmlFor="miles">Miles</Label>
            <Input id="miles" name="miles" type="number" step="0.1" value={formData.miles} onChange={handleChange} />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" as="textarea" rows={4} placeholder="Any additional notes about this leg..." value={formData.notes} onChange={handleChange} />
          </FormGroup>

          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </Form>
      </FormCard>
      <DangerZone>
        <Text variant="danger" size="lg" style={{ marginBottom: '1rem' }}>
          Once you delete a leg, there is no going back. This will delete the leg and all associated stops.
        </Text>
        <div>
          <Button
            onClick={handleDeleteLeg}
            variant="danger"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Leg'}
          </Button>
        </div>
      </DangerZone>
    </div>
    
  );
}

export default UpdateLeg;
