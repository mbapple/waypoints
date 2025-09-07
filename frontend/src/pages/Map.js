import React, { useEffect, useMemo, useState } from "react";
// no Link usage in this page after refactor
import { PageHeader } from "../components/page-components";
import { Text, Flex, Badge } from "../styles/components";
import { listTrips, getTripStatistics } from "../api/trips";
import { listNodesByTrip } from "../api/nodes";
import { listStopsByTrip } from "../api/stops";
import { listLegsByTrip, getCarDetails } from "../api/legs";
import { Button } from "../styles/components";
import { getTripColor } from "../styles/mapTheme";
import MapView from "../components/MapView";
import { buildMapLayersForAllTrips } from "../utils/mapData";



function MapPage() {
	const [loading, setLoading] = useState(true);
	const [trips, setTrips] = useState([]);
	const [nodesByTrip, setNodesByTrip] = useState({});
	const [legsByTrip, setLegsByTrip] = useState({});
	const [stopsByTrip, setStopsByTrip] = useState({});
	const [carPolylineByLeg, setCarPolylineByLeg] = useState({});
	const [totalMiles, setTotalMiles] = useState(0);
	const [totalDestinations, setTotalDestinations] = useState(0);
	const [totalCountries, setTotalCountries] = useState(0);
	const [highlightMode, setHighlightMode] = useState("off"); // off | countries | states

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			try {
				const tripList = await listTrips();
				if (cancelled) return;
				setTrips(tripList);
				try {
					const stats = await getTripStatistics();
					if (!cancelled) {
						setTotalMiles(stats?.all_trip_miles ?? 0);
						setTotalDestinations(stats?.unique_destination_count ?? 0);
						setTotalCountries(stats?.country_count ?? 0);
					}
				} catch {}

				const nodesPromises = tripList.map((t) => listNodesByTrip(t.id).then((n) => [t.id, n]));
				const legsPromises = tripList.map((t) => listLegsByTrip(t.id).then((l) => [t.id, l]));
				const stopsPromises = tripList.map((t) => listStopsByTrip(t.id).then((s) => [t.id, s]));
				const [nodesPairs, legsPairs, stopsPairs] = await Promise.all([
					Promise.all(nodesPromises),
					Promise.all(legsPromises),
					Promise.all(stopsPromises),
				]);
				if (cancelled) return;

				const nodesMap = Object.fromEntries(nodesPairs);
				const legsMap = Object.fromEntries(legsPairs);
				const stopsMap = Object.fromEntries(stopsPairs);
				setNodesByTrip(nodesMap);
				setLegsByTrip(legsMap);
				setStopsByTrip(stopsMap);

				const carLegs = Object.values(legsMap).flat().filter((leg) => (leg.type || "").toLowerCase() === "car");
				const uniqueCarLegs = carLegs.filter((l) => l && l.id);
				const carDetailsPairs = await Promise.all(
					uniqueCarLegs.map(async (leg) => {
						try {
							const details = await getCarDetails(leg.id);
							return [leg.id, details?.polyline || null];
						} catch {
							return [leg.id, null];
						}
					})
				);
				if (cancelled) return;
				setCarPolylineByLeg(Object.fromEntries(carDetailsPairs));
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error("Failed to load map data", e);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const { markers, stopMarkers, polylines, bounds, nodeById, stopsByNodeId, visitedCountries, visitedStates } = useMemo(() =>
		buildMapLayersForAllTrips({ nodesByTrip, legsByTrip, stopsByTrip, carPolylineByLeg })
	, [nodesByTrip, legsByTrip, stopsByTrip, carPolylineByLeg]);

	return (
		<div>
			<PageHeader>
				<Flex justify="space-between" align="center">
					<h1>Your Trips</h1>
					<a href="/statistics" style={{ textDecoration: "none", color: "inherit" }}>
						<Text variant="muted">
							{loading ? "Loading trips…" : `${trips.length} trips, ${totalMiles} miles, ${totalCountries} countries, ${totalDestinations} destinations`}
						</Text>
					</a>
				</Flex>
			</PageHeader>
			
			<div style = {{height: "70vh"}}>
				<MapView
					markers={markers}
					stopMarkers={stopMarkers}
					polylines={polylines}
					bounds={bounds}
					highlightMode={highlightMode}
					nodeById={nodeById}
					stopsByNodeId={stopsByNodeId}
					visitedCountries={visitedCountries}
					visitedStates={visitedStates}
					pathForTripId={(id) => `/trip/${id}`}
					linkLabel="View trip"
				/>
			</div>

			<Flex gap={2} style={{ marginTop: 12, flexWrap: "wrap" }}>
				{trips.map((t) => (
					<Flex key={t.id} align="center" gap={2}>
						<span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 9999, background: getTripColor(t.id) }} />
						<Badge variant="outline">{t.name}</Badge>
					</Flex>
				))}
			</Flex>
			
			{/* Selection for highlighting countries/states */}
			<Flex gap={2} style={{ marginTop: 8, alignItems: "center" }}>
				<Text variant="muted">Highlight:</Text>
				<Button  variant="ghost" onClick={() => setHighlightMode("off")} disabled={highlightMode === "off"}>Off</Button>
				<Button  variant="ghost" onClick={() => setHighlightMode("countries")} disabled={highlightMode === "countries"}>Countries</Button>
				<Button  variant="ghost" onClick={() => setHighlightMode("states")} disabled={highlightMode === "states"}>States</Button>
			</Flex>
		</div>
	);
}

export default MapPage;
 
