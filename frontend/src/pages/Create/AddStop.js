import React, {useState} from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {FormCard} from "../../components/input-components";
import {PageHeader} from "../../components/page-components";
import {PlaceSearchInput} from "../../components/map-integration-components";
import { Button, Text, Flex, Form, FormGroup, Label, Input, Select } from "../../styles/components";
import { listNodesByTrip } from "../../api/nodes";
import { listLegsByTrip } from "../../api/legs";
import { createStop } from "../../api/stops";
import { placeToOsmFields } from "../../utils/places";


function AddStop() {
    const { tripID } = useParams();
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
        osmState: ""
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
            await createStop({
                trip_id: tripID,
                name: formData.name,
                leg_id: formData.legID,
                node_id: formData.nodeID,
                category: formData.category,
                notes: formData.notes,
                latitude: formData.latitude,
                longitude: formData.longitude,
                osm_name: formData.osmName,
                osm_id: formData.osmID,
                osm_country: formData.osmCountry,
                osm_state: formData.osmState
            });
            
            // Redirect back to trip details
            navigate(`/trip/${tripID}`);
        } catch (err) {
            console.error(err);
            alert("Failed to create stop. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const [nodes, setNodes] = useState([]);
    const [legs, setLegs] = useState([]);

    // Fetch nodes and legs for the trip so that user can match stop to
    React.useEffect(() => {
        const fetchTripData = async () => {
            try {
                const nodesResponse = await listNodesByTrip(tripID);
                setNodes(nodesResponse);

                const legsResponse = await listLegsByTrip(tripID);
                setLegs(legsResponse);
            } catch (err) {
                console.error(err);
            }
        };

        fetchTripData();
    }, [tripID]);

    return (
        <div>
            <PageHeader>
                <Flex justify="space-between" align="flex-start" wrap>
                    <div>
                        <h1>Add New Stop</h1>
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
                <Form onSubmit={handleSubmit}>
                    <FormGroup>
                        <Label htmlFor="name">Stop Name *</Label>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label htmlFor="association">Associate this stop to either a Leg or a Node *</Label>
                        <Select
                            id="association"
                            name="association"
                            required
                            value={formData.legID || formData.nodeID || ""}
                            onChange={(e) => {
                                const value = e.target.value;
                                const selectedOption = e.target.options[e.target.selectedIndex];
                                const type = selectedOption.dataset.type;
                                
                                if (type === 'leg') {
                                    setFormData(prev => ({
                                        ...prev,
                                        legID: value,
                                        nodeID: null
                                    }));
                                } else if (type === 'node') {
                                    setFormData(prev => ({
                                        ...prev,
                                        nodeID: value,
                                        legID: null
                                    }));
                                } else {
                                    setFormData(prev => ({
                                        ...prev,
                                        legID: null,
                                        nodeID: null
                                    }));
                                }
                            }}
                        >
                            <option value="">Select Leg or Node</option>
                            {legs.map(leg => (
                                <option key={`leg-${leg.id}`} value={leg.id} data-type="leg">
                                    Leg: {leg.type} from {leg.start_node_name} to {leg.end_node_name}
                                </option>
                            ))}
                            {nodes.map(node => (
                                <option key={`node-${node.id}`} value={node.id} data-type="node">
                                    Node: {node.name}
                                </option>
                            ))}
                        </Select>
                    </FormGroup>

                    <FormGroup>
                        <Label htmlFor="location">Location</Label>
                        <PlaceSearchInput
                            id="location"
                            name="location"
                            placeholder="Search for a location..."
                            onPlaceSelect={(place) => {
                                setFormData(prev => ({
                                    ...prev,
                                    ...placeToOsmFields(place)
                                }));
                            }}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label htmlFor="type">Category *</Label>
                        <Select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            required
                            
                        >
                            <option value="">Select category</option>
                            <option value="hotel">Hotel</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="attraction">Attraction</option>
                            <option value="park">Bus</option>
                            <option value="other">Other</option>
                        </Select>
                    </FormGroup>
                    <FormGroup>
                        <Label htmlFor="notes">Notes</Label>
                        <Input
                            id="notes"
                            name="notes"
                            as="textarea"
                            rows={4}
                            value={formData.notes}
                            onChange={handleChange}
                            placeholder="Any additional notes about this stop..."
                        />
                    </FormGroup>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? "Adding Stop..." : "Add Stop"}
                    </Button>
    
               
                </Form>

            </FormCard>
        </div>
    );
}   

export default AddStop;