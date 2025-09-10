import React, {useState} from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {FormCard} from "../../components/input-components";
import {PageHeader} from "../../components/page-components";
import { Button, Text, Flex } from "../../styles/components";
import { listNodesByTrip } from "../../api/nodes";
import { listLegsByTrip } from "../../api/legs";
import { createStop } from "../../api/stops";
import StopForm from "../../components/forms/StopForm";


function AddStop() {
    const { tripID } = useParams();
    const navigate = useNavigate();

    const [formData] = useState({
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
        date: "",
    });

    const [loading, setLoading] = useState(false);
    
    const handleSubmit = async (data) => {
        setLoading(true);
        try {
            await createStop({
                trip_id: tripID,
                name: data.name,
                leg_id: data.legID || null,
                node_id: data.nodeID || null,
                category: data.category,
                notes: data.notes,
                latitude: data.latitude,
                longitude: data.longitude,
                osm_name: data.osmName,
                osm_id: data.osmID,
                osm_country: data.osmCountry,
                osm_state: data.osmState,
                date: data.date
            });
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
                                <StopForm
                                    nodes={nodes}
                                    legs={legs}
                                    initialValues={formData}
                                    onSubmit={handleSubmit}
                                    onCancel={() => window.history.back()}
                                    submitLabel={loading ? 'Adding Stop...' : 'Add Stop'}
                                    saving={loading}
                                />
                        </FormCard>
        </div>
    );
}   

export default AddStop;