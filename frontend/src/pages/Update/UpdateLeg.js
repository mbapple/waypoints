import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FormCard, DangerZone } from "../../components/input-components";
import { PageHeader } from "../../components/page-components";
import { Button, Text, Flex } from "../../styles/components";
import ConfirmDeleteButton from "../../components/common/ConfirmDeleteButton";
import { listNodesByTrip } from "../../api/nodes";
import { getLeg, updateLeg as apiUpdateLeg, deleteLeg as apiDeleteLeg, getCarDetails, createCarDetails, getFlightDetails, createFlightDetails } from "../../api/legs";
import LegForm from "../../components/forms/LegForm";

function UpdateLeg() {
  const { tripID } = useParams();
  const navigate = useNavigate();
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
  start_osm_country: "",
  start_osm_state: "",
  end_osm_name: "",
  end_osm_id: "",
  end_osm_country: "",
  end_osm_state: "",
  miles: "",
  // flight fields
  flight_number: "",
  airline: "",
  start_airport: "",
  end_airport: "",
  });

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  const handleDeleteLeg = async () => {
    try {
      await apiDeleteLeg(legID);
      navigate(`/trip/${tripID}`);
    } catch (err) {
      alert("Failed to delete leg.");
      console.error(err);
    }
  };


  useEffect(() => {
    const load = async () => {
      try {
  const [nodesData, legData, carData, flightData] = await Promise.all([
          listNodesByTrip(tripID),
          getLeg(legID),
          getCarDetails(legID).catch(() => null),
          getFlightDetails(legID).catch(() => null)
        ]);
        setNodes(nodesData);

        const l = legData;
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
          start_osm_country: l.start_osm_country || "",
          start_osm_state: l.start_osm_state || "",
          end_osm_name: l.end_osm_name || "",
          end_osm_id: l.end_osm_id || "",
          end_osm_country: l.end_osm_country || "",
          end_osm_state: l.end_osm_state || "",
          miles: l.miles || "",
          driving_time_seconds: carData?.driving_time_seconds || "",
          polyline: carData?.polyline || "",
          flight_number: flightData?.flight_number || "",
          airline: flightData?.airline || "",
          start_airport: flightData?.start_airport || "",
          end_airport: flightData?.end_airport || "",
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

  const handleSubmit = async (data) => {
    setSaving(true);

    try {
      await apiUpdateLeg(legID, {
        trip_id: parseInt(tripID, 10),
        type: data.type,
        start_node_id: data.fromNode ? Number(data.fromNode) : null,
        end_node_id: data.toNode ? Number(data.toNode) : null,
        notes: data.notes || null,
        date: data.date,
        start_latitude: data.start_latitude ? Number(data.start_latitude) : null,
        start_longitude: data.start_longitude ? Number(data.start_longitude) : null,
        end_latitude: data.end_latitude ? Number(data.end_latitude) : null,
        end_longitude: data.end_longitude ? Number(data.end_longitude) : null,
        start_osm_name: data.start_osm_name || null,
        start_osm_id: data.start_osm_id || null,
        start_osm_country: data.start_osm_country || null,
        start_osm_state: data.start_osm_state || null,
        end_osm_name: data.end_osm_name || null,
        end_osm_id: data.end_osm_id || null,
        end_osm_country: data.end_osm_country || null,
        end_osm_state: data.end_osm_state || null,
        miles: data.miles ? Number(data.miles) : null,
      });

      // Upsert car_details if car and we have details
    if (data.type === 'car') {
        await createCarDetails({
          leg_id: Number(legID),
      driving_time_seconds: data.driving_time_seconds ?? null,
      polyline: data.polyline ?? null,
        });
      }
      // Upsert flight_details if flight
      if (data.type === 'flight') {
        await createFlightDetails({
          leg_id: Number(legID),
          flight_number: data.flight_number || null,
          airline: data.airline || null,
          start_airport: data.start_airport || null,
          end_airport: data.end_airport || null,
        });
      }
      navigate(`/trip/${tripID}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update travel leg. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Node-derived autofill handled inside LegForm

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
        <LegForm
          nodes={nodes}
          initialValues={formData}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/trip/${tripID}`)}
          submitLabel={saving ? 'Saving...' : 'Save Changes'}
          saving={saving}
        />
      </FormCard>
      <DangerZone>
        <Text variant="danger" size="lg" style={{ marginBottom: '1rem' }}>
          Once you delete a leg, there is no going back. This will delete the leg and all associated stops.
        </Text>
        <div>
          <ConfirmDeleteButton
            onConfirm={handleDeleteLeg}
            confirmMessage="Are you sure you want to delete this leg? This action cannot be undone."
          >
            Delete Leg
          </ConfirmDeleteButton>
        </div>
      </DangerZone>
    </div>
    
  );
}

export default UpdateLeg;
