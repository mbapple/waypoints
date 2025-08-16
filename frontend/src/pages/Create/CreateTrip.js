import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Text, Button } from "../../styles/components";
import { createTrip } from "../../api/trips";
import TripForm from "../../components/forms/TripForm";
import { PageHeader } from "../../components/page-components";
import { FormCard } from "../../components/input-components";



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
      </PageHeader>

      <FormCard>
        <Button as={Link} to="/create/quick" variant="outline">
          Use Quick Create
        </Button>
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
