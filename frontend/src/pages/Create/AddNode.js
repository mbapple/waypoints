import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Card, Button, Text, Flex } from "../../styles/components";
import { createNode } from "../../api/nodes";
import NodeForm from "../../components/forms/NodeForm";

const PageHeader = styled.div`
  margin: ${props => props.theme.space[8]} 0 ${props => props.theme.space[6]} 0;
`;

const FormCard = styled(Card)`
  max-width: 600px;
  margin: 0 auto;
`;

// Buttons handled in NodeForm

function AddNode() {
  const { tripID } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const nodeData = {
        name: data.name,
        trip_id: Number(tripID),
        description: data.description,
        arrival_date: data.arrivalDate,
        departure_date: data.departureDate,
        notes: data.notes,
        latitude: data.latitude,
        longitude: data.longitude,
        osm_name: data.osmName,
        osm_id: data.osmID,
        osm_country: data.osmCountry,
        osm_state: data.osmState
      };
      await createNode(nodeData);
      navigate(`/trip/${tripID}`);
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
        <NodeForm
          initialValues={{
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
          }}
          onSubmit={handleSubmit}
          onCancel={() => window.history.back()}
          submitLabel={loading ? 'Adding...' : 'Add Destination'}
          saving={loading}
        />
      </FormCard>
    </div>
  );
}

export default AddNode;
