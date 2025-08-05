import React, {useState} from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { Card, Button, Text, Flex, Form, FormGroup, Label, Input, Select } from "../styles/components";

const PageHeader = styled.div`
  margin: ${props => props.theme.space[8]} 0 ${props => props.theme.space[6]} 0;
`;

// const ComingSoonCard = styled(Card)`
//   max-width: 600px;
//   margin: 0 auto;
//   text-align: center;
//   padding: ${props => props.theme.space[12]};
// `;

const FormCard = styled(Card)`
    max-width: 600px;
    margin: 0 auto;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.space[3]};
    justify-content: flex-end;
    margin-top: ${props => props.theme.space[6]};

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: column;
    }
`;

function AddLeg() {
  const { tripID } = useParams();

  const [formData, setFormData] = useState({
    type: "",
    fromNode: "",
    toNode: "",
    date: "",
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
    console.log('Form data values:', {
      trip_id: tripID,
      type: formData.type,
      start_node_id: formData.fromNode,
      end_node_id: formData.toNode,
    //   notes: formData.notes,
      date: formData.date,
    });

    await axios.post("http://localhost:3001/api/legs", {
      trip_id: tripID,
      type: formData.type,
      start_node_id: formData.fromNode,
      end_node_id: formData.toNode,
      notes: formData.notes,
      date: formData.date,
    });
        // Redirect back to trip details  
        window.location.href = `/trip/${tripID}`;
    } catch (err) {
      console.error(err);
      alert("Failed to create travel leg. Please try again.");
    } finally {
      setLoading(false);
    }
  };


const [nodes, setNodes] = useState([]);

// Fetch nodes for this trip
React.useEffect(() => {
    const fetchNodes = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/api/nodes/by_trip/${tripID}`);
            setNodes(response.data);
        } catch (err) {
            console.error('Failed to fetch nodes:', err);
        }
    };
    
    if (tripID) {
        fetchNodes();
    }
}, [tripID]);

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
                        <option value="">Select transport type</option>
                        <option value="flight">flight</option>
                        <option value="car">train</option>
                        <option value="train">car</option>
                        <option value="bus">bus</option>
                        <option value="boat">boat</option>
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

                <ButtonGroup>
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => window.history.back()}
                    >
                    Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={loading}
                        >
                        {loading ? 'Adding...' : 'Add Leg'}
                    </Button>
                </ButtonGroup>
            </Form>
        </FormCard>
    </div>
);
}

export default AddLeg;