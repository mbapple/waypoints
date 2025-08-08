import React, {useEffect, useMemo, useState} from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {FormCard} from "../../components/input-components";
import {PageHeader} from "../../components/page-components";
import { Button, Text, Flex, Form, FormGroup, Label, Input, Select } from "../../styles/components";
import { PlaceSearchInput } from "../../components/map-integration-components";
import { CarDetails, FlightDetails } from "../../components/leg-details-components";
import { listNodesByTrip } from "../../api/nodes";
import { createLeg, createCarDetails, createFlightDetails } from "../../api/legs";
import { placeToLegStart, placeToLegEnd } from "../../utils/places";

function AddLeg() {
  const { tripID } = useParams();
    const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: "",
    fromNode: "",
    toNode: "",
    date: "",
    notes: "",
    // locations (overrideable)
    start_latitude: "",
    start_longitude: "",
    end_latitude: "",
    end_longitude: "",
    start_osm_name: "",
    start_osm_id: "",
    end_osm_name: "",
    end_osm_id: "",
    miles: "",
    // flight fields
    flight_number: "",
    airline: "",
    start_airport: "",
    end_airport: "",
  });

  const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    }

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
            const payload = {
                trip_id: Number(tripID),
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
                end_osm_name: formData.end_osm_name || null,
                end_osm_id: formData.end_osm_id || null,
                miles: formData.miles ? Number(formData.miles) : null,
            };

            const legRes = await createLeg(payload);
            const newLegId = legRes?.id;

            if (formData.type === 'car' && newLegId && carAutoFill) {
                // Save car_details once
                await createCarDetails({
                    leg_id: newLegId,
                    driving_time_seconds: carAutoFill.driving_time_seconds ?? null,
                    polyline: carAutoFill.polyline ?? null,
                });
            }
            if (formData.type === 'flight' && newLegId) {
                await createFlightDetails({
                    leg_id: newLegId,
                    flight_number: formData.flight_number || null,
                    airline: formData.airline || null,
                    start_airport: formData.start_airport || null,
                    end_airport: formData.end_airport || null,
                });
            }
        // Redirect back to trip details  
        navigate(`/trip/${tripID}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create travel leg. Please try again.");
    } finally {
      setLoading(false);
    }
  };


const [nodes, setNodes] = useState([]);
const selectedFromNode = useMemo(() => nodes.find(n => String(n.id) === String(formData.fromNode)), [nodes, formData.fromNode]);
const selectedToNode = useMemo(() => nodes.find(n => String(n.id) === String(formData.toNode)), [nodes, formData.toNode]);

// Track car autofill to submit car_details once
const [carAutoFill, setCarAutoFill] = useState(null);

// Fetch nodes for this trip
React.useEffect(() => {
    const fetchNodes = async () => {
        try {
            const response = await listNodesByTrip(tripID);
            setNodes(response);
        } catch (err) {
            console.error('Failed to fetch nodes:', err);
    }
    };
    
    if (tripID) {
        fetchNodes();
    }
}, [tripID]);

// When nodes change selection, prefill locations but allow override
useEffect(() => {
    if (selectedFromNode) {
        setFormData(prev => ({
            ...prev,
            start_latitude: selectedFromNode.latitude ?? prev.start_latitude,
            start_longitude: selectedFromNode.longitude ?? prev.start_longitude,
            start_osm_name: selectedFromNode.osm_name ?? prev.start_osm_name,
            start_osm_id: selectedFromNode.osm_id ?? prev.start_osm_id,
            date: prev.date || (selectedFromNode.departure_date || ''),
        }));
    }
}, [selectedFromNode]);

useEffect(() => {
    if (selectedToNode) {
        setFormData(prev => ({
            ...prev,
            end_latitude: selectedToNode.latitude ?? prev.end_latitude,
            end_longitude: selectedToNode.longitude ?? prev.end_longitude,
            end_osm_name: selectedToNode.osm_name ?? prev.end_osm_name,
            end_osm_id: selectedToNode.osm_id ?? prev.end_osm_id,
        }));
    }
}, [selectedToNode]);

return (
    <div>
        <PageHeader>
            <Flex justify="space-between" align="flex-start" wrap>
                <div>
                    <h1>Add Travel Leg</h1>
                    <Text variant="secondary" size="lg">
                        Add transportation between destinations
                    </Text>
                </div>
                <Button as={Link} to={`/trip/${tripID}`} variant="outline">
                    ← Back to Trip
                </Button>
            </Flex>
        </PageHeader>

        <FormCard>
            <Form onSubmit={handleSubmit}>
                <FormGroup>
                    <Label htmlFor="type">Transport Type *</Label>
                    <Select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        required
                        
                    >
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
                    <Select
                        id="fromNode"
                        name="fromNode"
                        value={formData.fromNode}
                        onChange={handleChange}
                        required
                        
                    >
                        <option value="">Select starting node</option>
                        {nodes.map(node => (
                            <option key={node.id} value={node.id}>
                                {node.name}
                            </option>
                        ))}
                    </Select>
                </FormGroup>
                <FormGroup>
                    <Label htmlFor="toNode">To Node *</Label>
                    <Select
                        id="toNode"
                        name="toNode"
                        value={formData.toNode}
                        onChange={handleChange}
                        required
                        
                    >
                        <option value="">Select destination node</option>
                        {nodes.map(node => (
                            <option key={node.id} value={node.id}>
                                {node.name}
                            </option>
                        ))}
                    </Select>
                </FormGroup>
                <FormGroup>
                    <Label htmlFor="fromLocation">From Location</Label>
                    <PlaceSearchInput
                        placeholder="Search for a start location..."
                        value={formData.start_osm_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_osm_name: e.target.value }))}
                        onPlaceSelect={(place) => {
                            setFormData(prev => ({
                                ...prev,
                                ...placeToLegStart(place)
                            }));
                        }}
                    />
                    <small>Autofilled from node; you can override.</small>
                </FormGroup>
                <FormGroup>
                    <Label htmlFor="toLocation">To Location</Label>
                    <PlaceSearchInput
                        placeholder="Search for a destination..."
                        value={formData.end_osm_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_osm_name: e.target.value }))}
                        onPlaceSelect={(place) => {
                            setFormData(prev => ({
                                ...prev,
                                ...placeToLegEnd(place)
                            }));
                        }}
                    />
                    <small>Autofilled from node; you can override.</small>
                </FormGroup>
                <FormGroup>
                    <Label htmlFor = "date">Date *</Label>
                    <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                    />
                </FormGroup>

                                {formData.type === 'car' && (
                                    <FormGroup>
                                        <CarDetails
                                            start={{ lat: Number(formData.start_latitude), lon: Number(formData.start_longitude) }}
                                            end={{ lat: Number(formData.end_latitude), lon: Number(formData.end_longitude) }}
                                            initialMiles={formData.miles ? Number(formData.miles) : undefined}
                                            onAutoFill={({ miles, driving_time_seconds, polyline }) => {
                                                setFormData(prev => ({ ...prev, miles }));
                                                setCarAutoFill({ driving_time_seconds, polyline });
                                            }}
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
                                                                            onAutoFill={(data) => {
                                                                                if (typeof data.miles === 'number') {
                                                                                    setFormData(prev => ({ ...prev, miles: data.miles.toFixed(1) }));
                                                                                }
                                                                                const { flight_number, airline, start_airport, end_airport } = data;
                                                                                if (flight_number !== undefined || airline !== undefined || start_airport !== undefined || end_airport !== undefined) {
                                                                                    setFormData(prev => ({
                                                                                        ...prev,
                                                                                        flight_number: flight_number ?? prev.flight_number,
                                                                                        airline: airline ?? prev.airline,
                                                                                        start_airport: start_airport ?? prev.start_airport,
                                                                                        end_airport: end_airport ?? prev.end_airport,
                                                                                    }));
                                                                                }
                                                                            }}
                                                                        />
                                                                    </FormGroup>
                                                                )}
                                <FormGroup>
                                    <Label htmlFor="notes">Notes</Label>
                                    <Input
                                            id="notes" 
                                            name="notes"
                                            as="textarea"
                                            rows={4}
                                            placeholder="Any additional notes about this leg..."
                                            value={formData.notes}
                                            onChange={handleChange}
                                    />
                                </FormGroup>

                <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={loading}
                    >
                    {loading ? 'Adding...' : 'Add Leg'}
                </Button>
            </Form>
        </FormCard>
    </div>
);
}

export default AddLeg;