import React, { useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Card, Button, Input, Form, FormGroup, Label, Text } from "../styles/components";

const PageHeader = styled.div`
  margin: ${props => props.theme.space[8]} 0 ${props => props.theme.space[6]} 0;
  text-align: center;
`;

const FormCard = styled(Card)`
  max-width: 600px;
  margin: 0 auto;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${props => props.theme.space[3]};
  justify-content: flex-end;
  margin-top: ${props => props.theme.space[6]};
  
  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

function CreateTrip() {
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post("http://localhost:3001/api/trips", {
        name: formData.name,
        start_date: formData.startDate,
        end_date: formData.endDate,
        description: formData.description,
      });
      
      // Redirect to trips list or show success message
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("Failed to create trip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader>
        <h1>Create a New Trip</h1>
        <Text variant="secondary" size="lg">
          Plan your next adventure and start tracking your journey
        </Text>
      </PageHeader>

      <FormCard>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">Trip Name *</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., Summer Vacation to Italy"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="startDate">Start Date *</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="endDate">End Date *</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleChange}
              required
              min={formData.startDate}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              as="textarea"
              rows={4}
              placeholder="Tell us about your trip plans..."
              value={formData.description}
              onChange={handleChange}
              style={{ resize: 'vertical', minHeight: '100px' }}
            />
          </FormGroup>

          <ButtonGroup>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Trip'}
            </Button>
          </ButtonGroup>
        </Form>
      </FormCard>
    </div>
  );
}

export default CreateTrip;
