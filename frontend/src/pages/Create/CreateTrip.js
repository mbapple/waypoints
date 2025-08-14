import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { Card, Text } from "../../styles/components";
import { createTrip } from "../../api/trips";
import TripForm from "../../components/forms/TripForm";

const PageHeader = styled.div`
  margin: ${props => props.theme.space[8]} 0 ${props => props.theme.space[6]} 0;
  text-align: center;
`;

const FormCard = styled(Card)`
  max-width: 600px;
  margin: 0 auto;
`;

// Buttons are handled inside TripForm

function CreateTrip() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      await createTrip({
        name: data.name,
        start_date: data.startDate,
        end_date: data.endDate,
        description: data.description,
      });
      navigate("/");
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
        <Text variant="secondary">Prefer a single form to outline nodes and legs? <Link to="/create/quick">Use Quick Create</Link>.</Text>
        <TripForm
          initialValues={{ name: "", startDate: "", endDate: "", description: "" }}
          onSubmit={handleSubmit}
          onCancel={() => window.history.back()}
          submitLabel={loading ? "Creating..." : "Create Trip"}
          saving={loading}
        />
      </FormCard>
    </div>
  );
}

export default CreateTrip;
