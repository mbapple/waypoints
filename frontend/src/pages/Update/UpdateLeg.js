import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FormCard, DangerZone } from "../../components/input-components";
import { PageHeader } from "../../components/page-components";
import { Button, Text, Flex, Form, FormGroup, Label, Input, Select } from "../../styles/components";
import { PlaceSearchInput } from "../../components/map-integration-components";
import { CarDetails, FlightDetails } from "../../components/leg-details-components";
import ConfirmDeleteButton from "../../components/common/ConfirmDeleteButton";
import { listNodesByTrip } from "../../api/nodes";
import { getLeg, updateLeg as apiUpdateLeg, deleteLeg as apiDeleteLeg, getCarDetails, createCarDetails, getFlightDetails, createFlightDetails } from "../../api/legs";
import NodeSelect from "../../components/common/NodeSelect";
import { placeToLegStart, placeToLegEnd } from "../../utils/places";

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
  const [carAutoFill, setCarAutoFill] = useState(null);

  // Stable autofill callbacks to avoid child effect loops
  const handleCarAutoFill = useCallback(({ miles, driving_time_seconds, polyline }) => {
    setFormData(prev => ({
      ...prev,
      ...(typeof miles === 'number' ? { miles: miles.toFixed(1) } : {}),
    }));
    setCarAutoFill({
      ...(driving_time_seconds !== undefined ? { driving_time_seconds } : {}),
      ...(polyline !== undefined ? { polyline } : {}),
    });
  }, []);

  const handleFlightAutoFill = useCallback((data) => {
    const { miles, flight_number, airline, start_airport, end_airport } = data || {};
    setFormData(prev => ({
      ...prev,
      ...(typeof miles === 'number' ? { miles: miles.toFixed(1) } : {}),
      ...(flight_number !== undefined ? { flight_number } : {}),
      ...(airline !== undefined ? { airline } : {}),
      ...(start_airport !== undefined ? { start_airport } : {}),
      ...(end_airport !== undefined ? { end_airport } : {}),
    }));
  }, []);


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
          flight_number: flightData?.flight_number || "",
          airline: flightData?.airline || "",
          start_airport: flightData?.start_airport || "",
          end_airport: flightData?.end_airport || "",
        });
        setCarAutoFill(carData ? { driving_time_seconds: carData.driving_time_seconds, polyline: carData.polyline } : null);
      } catch (e) {
        console.error(e);
        alert("Failed to load leg.");
      } finally {
        setLoading(false);
      }
    };
    if (legID) load();
  }, [tripID, legID]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await apiUpdateLeg(legID, {
        trip_id: parseInt(tripID, 10),
        type: formData.type,
        start_node_id: formData.fromNode ? Number(formData.fromNode) : null,
        end_node_id: formData.toNode ? Number(formData.toNode) : null,
        notes: formData.notes || null,
        date: formData.date,
        start_latitude: formData.start_latitude ? Number(formData.start_latitude) : null,
        start_longitude: formData.start_longitude ? Number(formData.start_longitude) : null,
        end_latitude: formData.end_latitude ? Number(formData.end_latitude) : null,
        end_longitude: formData.end_longitude ? Number(formData.end_longitude) : null,
        start_osm_name: formData.start_osm_name || null,
        start_osm_id: formData.start_osm_id || null,
        start_osm_country: formData.start_osm_country || null,
        start_osm_state: formData.start_osm_state || null,
        end_osm_name: formData.end_osm_name || null,
        end_osm_id: formData.end_osm_id || null,
        end_osm_country: formData.end_osm_country || null,
        end_osm_state: formData.end_osm_state || null,
        miles: formData.miles ? Number(formData.miles) : null,
      });

      // Upsert car_details if car and we have details
      if (formData.type === 'car') {
        await createCarDetails({
          leg_id: Number(legID),
          driving_time_seconds: carAutoFill?.driving_time_seconds ?? null,
          polyline: carAutoFill?.polyline ?? null,
        });
      }
      // Upsert flight_details if flight
      if (formData.type === 'flight') {
        await createFlightDetails({
          leg_id: Number(legID),
          flight_number: formData.flight_number || null,
          airline: formData.airline || null,
          start_airport: formData.start_airport || null,
          end_airport: formData.end_airport || null,
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

  const selectedFromNode = useMemo(() => nodes.find(n => String(n.id) === String(formData.fromNode)), [nodes, formData.fromNode]);
  const selectedToNode = useMemo(() => nodes.find(n => String(n.id) === String(formData.toNode)), [nodes, formData.toNode]);
  

  useEffect(() => {
    if (selectedFromNode) {
      setFormData(prev => ({
        ...prev,
        start_latitude: prev.start_latitude || selectedFromNode.latitude || "",
        start_longitude: prev.start_longitude || selectedFromNode.longitude || "",
        start_osm_name: prev.start_osm_name || selectedFromNode.osm_name || "",
        start_osm_id: prev.start_osm_id || selectedFromNode.osm_id || "",
        date: prev.date || (selectedFromNode.departure_date || ''),
      }));
    }
  }, [selectedFromNode]);

  useEffect(() => {
    if (selectedToNode) {
      setFormData(prev => ({
        ...prev,
        end_latitude: prev.end_latitude || selectedToNode.latitude || "",
        end_longitude: prev.end_longitude || selectedToNode.longitude || "",
        end_osm_name: prev.end_osm_name || selectedToNode.osm_name || "",
        end_osm_id: prev.end_osm_id || selectedToNode.osm_id || "",
      }));
    }
  }, [selectedToNode]);

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
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="type">Transport Type *</Label>
            <Select id="type" name="type" value={formData.type} onChange={handleChange} required>
              <option value="">Select Transport Type</option>
              <option value="flight">Flight</option>
              <option value="car">Car</option>
              <option value="train">Train</option>
              <option value="bus">Bus</option>
              <option value="boat">Boat</option>
              <option value="other">Other</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="fromNode">From Node *</Label>
            <NodeSelect id="fromNode" name="fromNode" nodes={nodes} value={formData.fromNode} onChange={handleChange} required />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="toNode">To Node *</Label>
            <NodeSelect id="toNode" name="toNode" nodes={nodes} value={formData.toNode} onChange={handleChange} required />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="date">Date *</Label>
            <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} required />
          </FormGroup>

          <FormGroup>
            <Label>From Location</Label>
      <PlaceSearchInput
              placeholder="Search for a start location..."
              value={formData.start_osm_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, start_osm_name: e.target.value }))}
              onPlaceSelect={(place) => setFormData(prev => ({
        ...prev,
        ...placeToLegStart(place)
              }))}
            />
          </FormGroup>

          <FormGroup>
            <Label>To Location</Label>
      <PlaceSearchInput
              placeholder="Search for a destination..."
              value={formData.end_osm_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, end_osm_name: e.target.value }))}
              onPlaceSelect={(place) => setFormData(prev => ({
        ...prev,
        ...placeToLegEnd(place)
              }))}
            />
          </FormGroup>

      {formData.type === 'car' && (
            <FormGroup>
              <CarDetails
                start={{ lat: Number(formData.start_latitude), lon: Number(formData.start_longitude) }}
                end={{ lat: Number(formData.end_latitude), lon: Number(formData.end_longitude) }}
                initialMiles={formData.miles ? Number(formData.miles) : undefined}
        onAutoFill={handleCarAutoFill}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label htmlFor="miles">Miles</Label>
            <Input id="miles" name="miles" type="number" step="0.1" value={formData.miles} onChange={handleChange} />
          </FormGroup>

      {formData.type === 'flight' && (
            <FormGroup>
              <FlightDetails
                start={{ lat: Number(formData.start_latitude), lon: Number(formData.start_longitude) }}
                end={{ lat: Number(formData.end_latitude), lon: Number(formData.end_longitude) }}
                initialFlightNumber={formData.flight_number}
                initialAirline={formData.airline}
                initialStartAirport={formData.start_airport}
                initialEndAirport={formData.end_airport}
        onAutoFill={handleFlightAutoFill}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" as="textarea" rows={4} placeholder="Any additional notes about this leg..." value={formData.notes} onChange={handleChange} />
          </FormGroup>

          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </Form>
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
