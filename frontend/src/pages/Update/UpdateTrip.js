import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, Input, Form, FormGroup, Label, Text } from "../../styles/components";
import { PageHeader } from "../../components/page-components";
import { FormCard, ButtonGroup } from "../../components/input-components";
import { useParams, Link } from "react-router-dom";

function UpdateTrip() {
  const { tripID } = useParams();
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTrip = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/api/trips/${tripID}`);
        const t = res.data;
        setFormData({
          name: t.name || "",
          startDate: t.start_date || "",
          endDate: t.end_date || "",
          description: t.description || "",
        });
      } catch (e) {
        console.error(e);
        alert("Failed to load trip.");
      } finally {
        setLoading(false);
      }
    };
    loadTrip();
  }, [tripID]);

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
        start_date: formData.startDate,
        end_date: formData.endDate,
        description: formData.description,
      };
      await axios.put(`http://localhost:3001/api/trips/${tripID}`, payload);
      window.location.href = `/trip/${tripID}`;
    } catch (err) {
      console.error(err);
      alert("Failed to update trip.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader>
          <Text variant="muted">Loading trip...</Text>
        </PageHeader>
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <h1>Update Trip</h1>
        <Text variant="secondary" size="lg">Modify trip information</Text>
      </PageHeader>

      <FormCard>
        <Form onSubmit={handleSubmit}>
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
          <ButtonGroup>
            <Button as={Link} to={`/trip/${tripID}`} variant="outline">Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </ButtonGroup>
        </Form>
      </FormCard>
    </div>
  );
}

export default UpdateTrip;
