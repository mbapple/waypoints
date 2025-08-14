// using shared LegForm; previous inline form and helpers removed

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FormCard } from "../../components/input-components";
import { PageHeader } from "../../components/page-components";
import { Button, Text, Flex } from "../../styles/components";
import { listNodesByTrip } from "../../api/nodes";
import { createLeg, createCarDetails, createFlightDetails } from "../../api/legs";
import LegForm from "../../components/forms/LegForm";

function AddLeg() {
    const { tripID } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [nodes, setNodes] = useState([]);

    useEffect(() => {
        const fetchNodes = async () => {
            try {
                const response = await listNodesByTrip(tripID);
                setNodes(response);
            } catch (err) {
                console.error("Failed to fetch nodes:", err);
            }
        };
        if (tripID) fetchNodes();
    }, [tripID]);

    const handleSubmit = async (data) => {
        setLoading(true);
        try {
            const payload = {
                trip_id: Number(tripID),
                type: data.type,
                start_node_id: data.fromNode ? Number(data.fromNode) : null,
                end_node_id: data.toNode ? Number(data.toNode) : null,
                notes: data.notes || null,
                date: data.date,
                start_latitude: data.start_latitude ? Number(data.start_latitude) : null,
                start_longitude: data.start_longitude ? Number(data.start_longitude) : null,
                end_latitude: data.end_latitude ? Number(data.end_latitude) : null,
                end_longitude: data.end_longitude ? Number(data.end_longitude) : null,
                start_osm_name: data.start_osm_name || null,
                start_osm_id: data.start_osm_id || null,
                start_osm_country: data.start_osm_country || null,
                start_osm_state: data.start_osm_state || null,
                end_osm_name: data.end_osm_name || null,
                end_osm_id: data.end_osm_id || null,
                end_osm_country: data.end_osm_country || null,
                end_osm_state: data.end_osm_state || null,
                miles: data.miles ? Number(data.miles) : null,
            };

            const legRes = await createLeg(payload);
            const newLegId = legRes?.id;

            if (data.type === "car" && newLegId) {
                await createCarDetails({
                    leg_id: newLegId,
                    driving_time_seconds: data.driving_time_seconds ?? null,
                    polyline: data.polyline ?? null,
                });
            }
            if (data.type === "flight" && newLegId) {
                await createFlightDetails({
                    leg_id: newLegId,
                    flight_number: data.flight_number || null,
                    airline: data.airline || null,
                    start_airport: data.start_airport || null,
                    end_airport: data.end_airport || null,
                });
            }
            navigate(`/trip/${tripID}`);
        } catch (err) {
            console.error(err);
            alert("Failed to create travel leg. Please try again.");
        } finally {
            setLoading(false);
        }
    };

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
                <LegForm
                    nodes={nodes}
                    onSubmit={handleSubmit}
                    onCancel={() => navigate(`/trip/${tripID}`)}
                    submitLabel={loading ? "Adding..." : "Add Leg"}
                    saving={loading}
                />
            </FormCard>
        </div>
    );
}

export default AddLeg;