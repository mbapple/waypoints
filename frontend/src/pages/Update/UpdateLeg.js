import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { FormCard } from "../../components/input-components";
import { PageHeader } from "../../components/page-components";
import { Button, Text, Flex, Form, FormGroup, Label, Input, Select } from "../../styles/components";

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
  });

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [nodesRes, legRes] = await Promise.all([
          axios.get(`http://localhost:3001/api/nodes/by_trip/${tripID}`),
          axios.get(`http://localhost:3001/api/legs/${legID}`)
        ]);
        setNodes(nodesRes.data);

        const l = legRes.data;
        setFormData({
          type: l.type || "",
          fromNode: l.start_node_id || "",
          toNode: l.end_node_id || "",
          date: l.date || "",
          notes: l.notes || "",
        });
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
        start_node_id: formData.fromNode,
        end_node_id: formData.toNode,
        notes: formData.notes || null,
        date: formData.date,
      });
      window.location.href = `/trip/${tripID}`;
    } catch (err) {
      console.error(err);
      alert("Failed to update travel leg. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" as="textarea" rows={4} placeholder="Any additional notes about this leg..." value={formData.notes} onChange={handleChange} />
          </FormGroup>

          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </Form>
      </FormCard>
    </div>
  );
}

export default UpdateLeg;
