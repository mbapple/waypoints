import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { FormCard, DangerZone } from "../../components/input-components";
import { PageHeader } from "../../components/page-components";
import useDocumentTitle from "../../utils/useDocumentTitle";
import { Button, Text, Flex } from "../../styles/components";
import ConfirmDeleteButton from "../../components/common/ConfirmDeleteButton";
import { listNodesByTrip } from "../../api/nodes";
import { listLegsByTrip } from "../../api/legs";
import { getStop as apiGetStop, updateStop as apiUpdateStop, deleteStop as apiDeleteStop } from "../../api/stops";
import StopForm from "../../components/forms/StopForm";
import TripContext from "../../components/forms/TripContext";

function UpdateStop() {
  const { tripID } = useParams();
  const [params] = useSearchParams();
  const stopID = params.get("stopID");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    legID: "",
    nodeID: "",
    category: "",
    notes: "",
    latitude: "",
    longitude: "",
    osmName: "",
    osmID: "",
    osmCountry: "",
    osmState: "",
  start_date: "",
  end_date: "",
    isLodging: false,
  });

  const [nodes, setNodes] = useState([]);
  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useDocumentTitle(formData.name ? `Edit ${formData.name}` : "Edit stop");

  const handleDeleteStop = async () => {
    try {
      await apiDeleteStop(stopID);
      navigate(`/trip/${tripID}`);
    } catch (err) {
      alert("Failed to delete stop.");
      console.error(err);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [nodesData, legsData, stopData] = await Promise.all([
          listNodesByTrip(tripID),
          listLegsByTrip(tripID),
          apiGetStop(stopID)
        ]);
        setNodes(nodesData);
        setLegs(legsData);

        const s = stopData;
        setFormData({
          name: s.name || "",
          legID: s.leg_id || "",
          nodeID: s.node_id || "",
          category: s.category || "",
          notes: s.notes || "",
          latitude: s.latitude || "",
          longitude: s.longitude || "",
          osmName: s.osm_name || "",
          osmID: s.osm_id || "",
          osmCountry: s.osm_country || "",
          osmState: s.osm_state || "",
          start_date: s.start_date || "",
          end_date: s.end_date || "",
          isLodging: !!s.is_lodging,
        });
      } catch (e) {
        console.error(e);
        alert("Failed to load stop.");
      } finally {
        setLoading(false);
      }
    };
    if (stopID) load();
  }, [tripID, stopID]);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      await apiUpdateStop(stopID, {
        trip_id: parseInt(tripID, 10),
        name: data.name,
        leg_id: data.legID || null,
        node_id: data.nodeID || null,
        category: data.category,
        notes: data.notes || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        osm_name: data.osmName || null,
        osm_id: data.osmID || null,
        osm_country: data.osmCountry || null,
        osm_state: data.osmState || null,
  start_date: data.start_date || null,
  end_date: data.end_date || null,
        is_lodging: !!data.isLodging,
      });
      navigate(`/trip/${tripID}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update stop. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader>
          <Text variant="muted">Loading stop...</Text>
        </PageHeader>
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Update Stop</h1>
            <Text variant="secondary" size="lg">Edit details for this stop</Text>
          </div>
          <Button as={Link} to={`/trip/${tripID}`} variant="outline">← Back to Trip</Button>
        </Flex>
      </PageHeader>

      <FormCard>
        <TripContext tripID={tripID} what="stop" editing />
        <StopForm
          nodes={nodes}
          legs={legs}
          initialValues={formData}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/trip/${tripID}`)}
          submitLabel={saving ? 'Saving...' : 'Save Changes'}
          saving={saving}
        />
      </FormCard>

       <DangerZone>
          <Text variant="danger" size="lg" style={{ marginBottom: '1rem' }}>
            Once you delete a stop, there is no going back.
          </Text>
          <div>
            <ConfirmDeleteButton onConfirm={handleDeleteStop}>
              Delete Stop
            </ConfirmDeleteButton>
          </div>
        </DangerZone>
    </div>
  );
}

export default UpdateStop;
