import React, { useEffect, useState } from "react";
import { Button, Text, Flex } from "../../styles/components";
import { PageHeader } from "../../components/page-components";
import { FormCard, DangerZone } from "../../components/input-components";
import { useParams, Link, useNavigate } from "react-router-dom";
import ConfirmDeleteButton from "../../components/common/ConfirmDeleteButton";
import { deleteNode as apiDeleteNode, getNode as apiGetNode, updateNode as apiUpdateNode } from "../../api/nodes";
import NodeForm from "../../components/forms/NodeForm";

function UpdateNode() {
  const { tripID } = useParams();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const nodeID = params.get("nodeID");

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
    osmCountry: "",
    osmState: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleDeleteNode = async () => {
      try {
        await apiDeleteNode(nodeID);
        navigate(`/trip/${tripID}`);
      } catch (err) {
        alert("Failed to delete node.");
        console.error(err);
      }
    };

  useEffect(() => {
    const loadNode = async () => {
      try {
  const n = await apiGetNode(nodeID);
        setFormData({
          name: n.name || "",
          description: n.description || "",
          arrivalDate: n.arrival_date || "",
          departureDate: n.departure_date || "",
          notes: n.notes || "",
          latitude: n.latitude || "",
          longitude: n.longitude || "",
          osmName: n.osm_name || "",
          osmID: n.osm_id || "",
          osmCountry: n.osm_country || "",
          osmState: n.osm_state || "",
        });
      } catch (e) {
        console.error(e);
        alert("Failed to load node.");
      } finally {
        setLoading(false);
      }
    };
    if (nodeID) loadNode();
  }, [nodeID]);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        trip_id: parseInt(tripID, 10),
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
      };
      await apiUpdateNode(nodeID, payload);
      navigate(`/trip/${tripID}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update node.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader>
          <Text variant="muted">Loading node...</Text>
        </PageHeader>
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Update Destination</h1>
            <Text variant="secondary" size="lg">
              Modify details for this destination
            </Text>
          </div>
          <Button as={Link} to={`/trip/${tripID}`} variant="outline">
            ← Back to Trip
          </Button>
        </Flex>
      </PageHeader>

      <FormCard>
        <NodeForm
          initialValues={formData}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/trip/${tripID}`)}
          submitLabel={saving ? 'Saving...' : 'Save Changes'}
          saving={saving}
        />
      </FormCard>

       <DangerZone>
        <Text variant="danger" size="lg" style={{ marginBottom: '1rem' }}>
          Once you delete a node, there is no going back. This will delete the node and all associated stops.
        </Text>
        <div>
          <ConfirmDeleteButton
            onConfirm={handleDeleteNode}
            confirmMessage="Are you sure you want to delete this node? This action cannot be undone."
          >
            Delete Node
          </ConfirmDeleteButton>
        </div>
      </DangerZone>
    </div>
  );
}

export default UpdateNode;
