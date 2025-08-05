import React, {useState} from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import {FormCard} from "../components/input-components";
import {PageHeader} from "../components/page-components";
import { Button, Text, Flex, Form, FormGroup, Label, Input, Select } from "../styles/components";


function AddStop() {
    const { tripID } = useParams();

    const [formData, setFormData] = useState({
        name: "",
        legID: "",
        nodeID: "",
        category: "",
        notes: "",
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
            console.log("Submitting stop data:", {
                trip_id: tripID,
                name: formData.name,
                leg_id: formData.legID,
                node_id: formData.nodeID,
                category: formData.category,
                notes: formData.notes,
            });

            await axios.post("http://localhost:3001/api/stops", {
                trip_id: tripID,
                name: formData.name,
                leg_id: formData.legID,
                node_id: formData.nodeID,
                category: formData.category,
                notes: formData.notes,
            });
            
            // Redirect back to trip details
            window.location.href = `/trip/${tripID}`;
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
                const nodesResponse = await axios.get(`http://localhost:3001/api/nodes/by_trip/${tripID}`);
                setNodes(nodesResponse.data);

                const legsResponse = await axios.get(`http://localhost:3001/api/legs/by_trip/${tripID}`);
                setLegs(legsResponse.data);
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
                        <Label htmlFor="association">Associated Leg or Node *</Label>
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