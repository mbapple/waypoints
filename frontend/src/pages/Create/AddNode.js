import React, { useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import {PlaceSearchInput} from "../../components/map-integration-components";
import { Card, Button, Input, Form, FormGroup, Label, Text, Flex } from "../../styles/components";

const PageHeader = styled.div`
  margin: ${props => props.theme.space[8]} 0 ${props => props.theme.space[6]} 0;
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

function AddNode() {
  const { tripID } = useParams();
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
      await axios.post("http://localhost:3001/api/nodes", {
        name: formData.name,
        trip_id: tripID,
        description: formData.description,
        arrival_date: formData.arrivalDate,
        departure_date: formData.departureDate,
        notes: formData.notes,
        latitude: formData.latitude,
        longitude: formData.longitude,
        osm_name: formData.osmName,
        osm_id: formData.osmID,
      });
      
      // Redirect back to trip details
      window.location.href = `/trip/${tripID}`;
    } catch (err) {
      console.error(err);
      alert("Failed to create node. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Add New Destination</h1>
            <Text variant="secondary" size="lg">
              Add a new stop or destination to your trip
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
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., Rome, Italy"
              value={formData.name}
              onChange={handleChange}
              required
            />
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
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              type="text"
              placeholder="Brief description of this destination"
              value={formData.description}
              onChange={handleChange}
            />
          </FormGroup>

          <Flex gap={4}>
            <FormGroup style={{ flex: 1 }}>
              <Label htmlFor="arrivalDate">Arrival Date *</Label>
              <Input
                id="arrivalDate"
                name="arrivalDate"
                type="date"
                value={formData.arrivalDate}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup style={{ flex: 1 }}>
              <Label htmlFor="departureDate">Departure Date *</Label>
              <Input
                id="departureDate"
                name="departureDate"
                type="date"
                value={formData.departureDate}
                onChange={handleChange}
                required
                min={formData.arrivalDate}
              />
            </FormGroup>
          </Flex>

          <FormGroup>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              name="notes"
              as="textarea"
              rows={4}
              placeholder="Any additional notes about this destination..."
              value={formData.notes}
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
              {loading ? 'Adding...' : 'Add Destination'}
            </Button>
          </ButtonGroup>
        </Form>
      </FormCard>
    </div>
  );
}

export default AddNode;
