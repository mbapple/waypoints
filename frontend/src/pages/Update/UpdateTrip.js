import React, { useEffect, useState } from "react";
import { Text } from "../../styles/components";
import { PageHeader } from "../../components/page-components";
import { FormCard, DangerZone } from "../../components/input-components";
import { useParams, useNavigate } from "react-router-dom";
import { getTrip, updateTrip as apiUpdateTrip, deleteTrip as apiDeleteTrip } from "../../api/trips";
import ConfirmDeleteButton from "../../components/common/ConfirmDeleteButton";
import TripForm from "../../components/forms/TripForm";

function UpdateTrip() {
  const { tripID } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleDeleteTrip = async () => {
    try {
      await apiDeleteTrip(tripID);
      navigate(`/trips`);
    } catch (err) {
      alert("Failed to delete trip.");
      console.error(err);
    }
  };

  useEffect(() => {
    const loadTrip = async () => {
      try {
        const t = await getTrip(tripID);
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

  // Field updates handled inside TripForm

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        start_date: data.startDate,
        end_date: data.endDate,
        description: data.description,
      };
      await apiUpdateTrip(tripID, payload);
      navigate(`/trip/${tripID}`);
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
        <TripForm
          initialValues={formData}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/trip/${tripID}`)}
          submitLabel={saving ? "Saving..." : "Save Changes"}
          saving={saving}
        />
      </FormCard>

      <DangerZone>
        <Text variant="danger" size="lg" style={{ marginBottom: '1rem' }}>
          Danger Zone
        </Text>
        <Text variant="muted" style={{ marginBottom: '1rem' }}>
          Once you delete a trip, there is no going back. This will delete the trip and all associated legs, nodes, and stops.
        </Text>
        <div>
          <ConfirmDeleteButton
            onConfirm={handleDeleteTrip}
            confirmMessage="Are you sure you want to delete this trip? This action cannot be undone."
          >
            Delete Trip
          </ConfirmDeleteButton>
        </div>
      </DangerZone>
    </div>
  );
}

export default UpdateTrip;
