import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FormCard, ButtonGroup } from "../../components/input-components";
import { PageHeader } from "../../components/page-components";
import { Button, Text, Flex, Form, FormGroup, Label, Input, Select } from "../../styles/components";
import { PlaceSearchInput } from "../../components/map-integration-components";
import { CarDetails, FlightDetails } from "../../components/leg-details-components";
import { createTrip } from "../../api/trips";
import { createNode } from "../../api/nodes";
import { createLeg, createCarDetails, createFlightDetails } from "../../api/legs";
import { placeToOsmFields, placeToLegStart, placeToLegEnd } from "../../utils/places";

function CreateTripQuick() {
  const navigate = useNavigate();

  // Trip info
  const [tripInfo, setTripInfo] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [tripType, setTripType] = useState("");
  const [loading, setLoading] = useState(false);

  // Nodes list
  const [nodes, setNodes] = useState([
  // Include arrivalDate/departureDate (optional) explicitly for clarity
  { name: "", arrivalDate: "", departureDate: "", ...placeToOsmFields({}) },
  { name: "", arrivalDate: "", departureDate: "", ...placeToOsmFields({}) },
  ]);

  // Legs derived between nodes; overrides and details per leg
  const [legs, setLegs] = useState([]);

  // Keep legs array in sync with nodes length-1
  useEffect(() => {
    setLegs(prev => {
      const targetLen = Math.max(0, nodes.length - 1);
      const next = [...prev];
      if (next.length < targetLen) {
        while (next.length < targetLen) {
          next.push({
            date: "",
            notes: "",
            // overrides (optional)
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
            // car details
            driving_time_seconds: "",
            polyline: "",
            // flight details
            flight_number: "",
            airline: "",
            start_airport: "",
            end_airport: "",
          });
        }
      } else if (next.length > targetLen) {
        next.length = targetLen;
      }
      return next;
    });
  }, [nodes.length]);

  const updateTripInfo = (e) => {
    const { name, value } = e.target;
    setTripInfo(prev => ({ ...prev, [name]: value }));
  };

  const updateNodeField = (idx, patch) => {
    setNodes(prev => prev.map((n, i) => (i === idx ? { ...n, ...patch } : n)));
  };

  const updateLegField = (idx, patch) => {
    setLegs(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addNode = () => setNodes(prev => [...prev, { name: "", arrivalDate: "", departureDate: "", ...placeToOsmFields({}) }]);
  const removeNode = (idx) => setNodes(prev => prev.filter((_, i) => i !== idx));

  const effectiveLegEndpoints = (i) => {
    const fromNode = nodes[i] || {};
    const toNode = nodes[i + 1] || {};
    const leg = legs[i] || {};
    // Prefer overrides if provided; fall back to node coords/osm
    const start = {
      lat: Number(leg.start_latitude || fromNode.latitude || 0) || undefined,
      lon: Number(leg.start_longitude || fromNode.longitude || 0) || undefined,
    };
    const end = {
      lat: Number(leg.end_latitude || toNode.latitude || 0) || undefined,
      lon: Number(leg.end_longitude || toNode.longitude || 0) || undefined,
    };
    return { start, end };
  };

  const validate = () => {
    if (!tripInfo.name || !tripInfo.startDate || !tripInfo.endDate) return "Trip name, start date, and end date are required";
    if (!tripType) return "Transport type is required";
    if (nodes.length < 2) return "Add at least two nodes";
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n.name) return `Node ${i + 1} needs a display name`;
      if (!n.latitude || !n.longitude) return `Node ${i + 1} needs a location`;
      // Node arrival/departure dates are optional; no validation required
    }
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      if (!l.date) return `Leg ${i + 1} needs a date`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    setLoading(true);
    try {
      // 1) Create trip and get id
      const tripRes = await createTrip({
        name: tripInfo.name,
        start_date: tripInfo.startDate,
        end_date: tripInfo.endDate,
        description: tripInfo.description,
      });
      const tripId = tripRes?.id;
      if (!tripId) throw new Error("Trip ID missing from createTrip response");

      // 2) Create nodes sequentially and store their ids
      const createdNodes = [];
      for (const n of nodes) {
        const payload = {
          trip_id: Number(tripId),
          name: n.name,
          description: null,
          // Dates are optional
          arrival_date: n.arrivalDate || null,
          departure_date: n.departureDate || null,
          notes: null,
          latitude: n.latitude ? Number(n.latitude) : null,
          longitude: n.longitude ? Number(n.longitude) : null,
          osm_name: n.osmName || null,
          osm_id: n.osmID || null,
          osm_country: n.osmCountry || null,
          osm_state: n.osmState || null,
        };
        const res = await createNode(payload);
        const id = res?.id;
        if (!id) throw new Error("Node ID missing from createNode response");
        createdNodes.push({ ...n, id });
      }

      // 3) Create legs between adjacent nodes
      for (let i = 0; i < createdNodes.length - 1; i++) {
        const from = createdNodes[i];
        const to = createdNodes[i + 1];
        const l = legs[i] || {};

        // Use overrides when present, else default to nodes
        const startLat = l.start_latitude || from.latitude;
        const startLon = l.start_longitude || from.longitude;
        const endLat = l.end_latitude || to.latitude;
        const endLon = l.end_longitude || to.longitude;

        const payload = {
          trip_id: Number(tripId),
          type: tripType,
          start_node_id: Number(from.id),
          end_node_id: Number(to.id),
          notes: l.notes || null,
          date: l.date,
          start_latitude: startLat ? Number(startLat) : null,
          start_longitude: startLon ? Number(startLon) : null,
          end_latitude: endLat ? Number(endLat) : null,
          end_longitude: endLon ? Number(endLon) : null,
          start_osm_name: l.start_osm_name || from.osmName || null,
          start_osm_id: l.start_osm_id || from.osmID || null,
          start_osm_country: l.start_osm_country || from.osmCountry || null,
          start_osm_state: l.start_osm_state || from.osmState || null,
          end_osm_name: l.end_osm_name || to.osmName || null,
          end_osm_id: l.end_osm_id || to.osmID || null,
          end_osm_country: l.end_osm_country || to.osmCountry || null,
          end_osm_state: l.end_osm_state || to.osmState || null,
          miles: l.miles ? Number(l.miles) : null,
        };

        const legRes = await createLeg(payload);
        const newLegId = legRes?.id;

        if (tripType === "car" && newLegId) {
          await createCarDetails({
            leg_id: newLegId,
            driving_time_seconds: l.driving_time_seconds || null,
            polyline: l.polyline || null,
          });
        }
        if (tripType === "flight" && newLegId) {
          await createFlightDetails({
            leg_id: newLegId,
            flight_number: l.flight_number || null,
            airline: l.airline || null,
            start_airport: l.start_airport || null,
            end_airport: l.end_airport || null,
          });
        }
      }

      navigate(`/trip/${tripId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create quick trip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="flex-start" wrap>
          <div>
            <h1>Quick Create Trip</h1>
            <Text variant="secondary" size="lg">Outline an entire trip in one simple form</Text>
          </div>
          <Button as={Link} to="/" variant="outline">← Back</Button>
        </Flex>
      </PageHeader>

      <FormCard>
        <Form onSubmit={handleSubmit}>
          <h3>Trip Info</h3>
          <FormGroup>
            <Label htmlFor="name">Trip Name *</Label>
            <Input id="name" name="name" value={tripInfo.name} onChange={updateTripInfo} required placeholder="e.g., Europe 2026" />
          </FormGroup>
          <Flex gap={4}>
            <FormGroup style={{ flex: 1 }}>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input id="startDate" name="startDate" type="date" value={tripInfo.startDate} onChange={updateTripInfo} required />
            </FormGroup>
            <FormGroup style={{ flex: 1 }}>
              <Label htmlFor="endDate">End Date *</Label>
              <Input id="endDate" name="endDate" type="date" value={tripInfo.endDate} onChange={updateTripInfo} min={tripInfo.startDate} required />
            </FormGroup>
          </Flex>
          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" as="textarea" rows={3} value={tripInfo.description} onChange={updateTripInfo} />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="tripType">Transport Type *</Label>
            <Select id="tripType" value={tripType} onChange={(e) => setTripType(e.target.value)} required>
              <option value="">Select Transport Type</option>
              <option value="flight">Flight</option>
              <option value="car">Car</option>
              <option value="train">Train</option>
              <option value="bus">Bus</option>
              <option value="boat">Boat</option>
              <option value="other">Other</option>
            </Select>
          </FormGroup>

          <h3>Nodes</h3>
          {nodes.map((node, idx) => (
            <div key={idx} style={{ borderTop: "1px solid var(--border, rgba(255,255,255,0.08))", paddingTop: 12 }}>
              <Flex justify="space-between" align="center">
                <Label>Node {idx + 1}</Label>
                {nodes.length > 2 && (
                  <Button type="button" variant="outline" onClick={() => removeNode(idx)}>Remove</Button>
                )}
              </Flex>
              
              <Flex gap={4}>
                <FormGroup style={{ flex: 1 }}>
                  <Label htmlFor="arrivalDate">Arrival Date</Label>
                  <Input
                    type="date"
                    value={node.arrivalDate || ""}
                    onChange={(e) => updateNodeField(idx, { arrivalDate: e.target.value })}
                  />
                </FormGroup>

                <FormGroup style={{ flex: 1 }}>
                  <Label htmlFor="departureDate">Departure Date</Label>
                  <Input
                    type="date"
                    value={node.departureDate || ""}
                    onChange={(e) => updateNodeField(idx, { departureDate: e.target.value })}
                    // Use arrivalDate as a logical min if present (dates optional)
                    min={node.arrivalDate || undefined}
                  />
                </FormGroup>
              </Flex>

              <FormGroup>
                <Label>Display Name *</Label>
                <Input value={node.name} onChange={(e) => updateNodeField(idx, { name: e.target.value })} placeholder="e.g., Dallas" required />
              </FormGroup>
              <FormGroup>
                <Label>OSM Place *</Label>
                <PlaceSearchInput
                  placeholder="Search for a location..."
                  value={node.osmName || ""}
                  onChange={(e) => updateNodeField(idx, { osmName: e.target.value })}
                  onPlaceSelect={(place) => updateNodeField(idx, { ...placeToOsmFields(place) })}
                />
              </FormGroup>
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => addNode()}>+ Add Node</Button>

          {nodes.length > 1 && (
            <>
              <h3>Legs</h3>
              {legs.map((leg, idx) => {
                const from = nodes[idx];
                const to = nodes[idx + 1];
                const { start, end } = effectiveLegEndpoints(idx);
                return (
                  <div key={idx} style={{ borderTop: "1px solid var(--border, rgba(255,255,255,0.08))", paddingTop: 12 }}>
                    <Text variant="secondary">Leg {idx + 1}: {from?.name || 'Start'} → {to?.name || 'End'}</Text>
                    <FormGroup>
                      <Label>Date *</Label>
                      <Input type="date" value={leg.date} onChange={(e) => updateLegField(idx, { date: e.target.value })} required />
                    </FormGroup>
                    <FormGroup>
                      <Label>Override Start (optional)</Label>
                      <PlaceSearchInput
                        placeholder="Search for a start location..."
                        value={leg.start_osm_name || ""}
                        onChange={(e) => updateLegField(idx, { start_osm_name: e.target.value })}
                        onPlaceSelect={(place) => updateLegField(idx, { ...placeToLegStart(place) })}
                      />
                      <small>Defaults to node: {from?.osmName || from?.name || ''}</small>
                    </FormGroup>
                    <FormGroup>
                      <Label>Override End (optional)</Label>
                      <PlaceSearchInput
                        placeholder="Search for a destination..."
                        value={leg.end_osm_name || ""}
                        onChange={(e) => updateLegField(idx, { end_osm_name: e.target.value })}
                        onPlaceSelect={(place) => updateLegField(idx, { ...placeToLegEnd(place) })}
                      />
                      <small>Defaults to node: {to?.osmName || to?.name || ''}</small>
                    </FormGroup>

                    {tripType === 'car' && (
                      <FormGroup>
                        <CarDetails
                          start={start}
                          end={end}
                          initialMiles={leg.miles ? Number(leg.miles) : undefined}
                          onAutoFill={({ miles, driving_time_seconds, polyline }) => {
                            updateLegField(idx, {
                              ...(typeof miles === 'number' ? { miles: miles.toFixed(1) } : {}),
                              ...(driving_time_seconds !== undefined ? { driving_time_seconds } : {}),
                              ...(polyline !== undefined ? { polyline } : {}),
                            });
                          }}
                        />
                      </FormGroup>
                    )}

                    <FormGroup>
                      <Label>Miles</Label>
                      <Input type="number" step="0.1" value={leg.miles} onChange={(e) => updateLegField(idx, { miles: e.target.value })} />
                    </FormGroup>

                    {tripType === 'flight' && (
                      <FormGroup>
                        <FlightDetails
                          start={start}
                          end={end}
                          onAutoFill={(data) => updateLegField(idx, { ...data, ...(typeof data?.miles === 'number' ? { miles: data.miles.toFixed(1) } : {}) })}
                        />
                      </FormGroup>
                    )}

                    <FormGroup>
                      <Label>Notes</Label>
                      <Input as="textarea" rows={3} value={leg.notes} onChange={(e) => updateLegField(idx, { notes: e.target.value })} />
                    </FormGroup>
                  </div>
                );
              })}
            </>
          )}

          <ButtonGroup>
            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Creating…' : 'Create Trip'}</Button>
          </ButtonGroup>
        </Form>
      </FormCard>
    </div>
  );
}

export default CreateTripQuick;
