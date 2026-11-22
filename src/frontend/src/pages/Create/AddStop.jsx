import React, {useState} from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import {FormCard} from "../../components/input-components";
import {PageHeader} from "../../components/page-components";
import useDocumentTitle from "../../utils/useDocumentTitle";
import { Button, Text, Flex } from "../../styles/components";
import { listNodesByTrip } from "../../api/nodes";
import { listLegsByTrip } from "../../api/legs";
import { createStop } from "../../api/stops";
import StopForm from "../../components/forms/StopForm";
import TripContext from "../../components/forms/TripContext";


function AddStop() {
  useDocumentTitle("Add stop");
    const { tripID } = useParams();
    const navigate = useNavigate();

    // The itinerary's per-day "+" links here with ?date=YYYY-MM-DD&nodeID=N to prefill
    const [searchParams] = useSearchParams();

    const [formData] = useState({
        name: "",
        legID: "",
        nodeID: searchParams.get("nodeID") || "",
        category: "",
        notes: "",
        latitude: "",
        longitude: "",
        osmName: "",
        osmID: "",
        osmCountry: "",
        osmState: "",
    start_date: searchParams.get("date") || "",
    end_date: "",
        isLodging: false,
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
                // No location picked: send null (an empty string isn't a valid coordinate)
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
                                <TripContext tripID={tripID} what="stop" />
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