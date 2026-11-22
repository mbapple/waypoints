import React, { useState } from "react";
import useDocumentTitle from "../../utils/useDocumentTitle";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FormCard } from "../../components/input-components";
import { PageHeader } from "../../components/page-components";
import { Button, Text, Flex } from "../../styles/components";
import { createNode } from "../../api/nodes";
import NodeForm from "../../components/forms/NodeForm";
import TripContext from "../../components/forms/TripContext";

function AddNode() {
  useDocumentTitle("Add node");
  const { tripID } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const nodeData = {
        name: data.name,
        trip_id: Number(tripID),
        description: data.description || null,
        arrival_date: data.arrivalDate || null,
        departure_date: data.departureDate || null,
        notes: data.notes || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        osm_name: data.osmName || null,
        osm_id: data.osmID || null,
        osm_country: data.osmCountry || null,
        osm_state: data.osmState || null,
        invisible: data.isInvisible || false, // Default to false if not provided
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
        <TripContext tripID={tripID} what="destination" />
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
