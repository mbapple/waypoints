import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
// no Link usage in this page after refactor
import { PageHeader } from "../components/page-components";
import { Text, Flex, Badge } from "../styles/components";
import { listTrips, getTripStatistics } from "../api/trips";
import { listNodesByTrip } from "../api/nodes";
import { listStopsByTrip } from "../api/stops";
import { listLegsByTrip, loadLegPolylines } from "../api/legs";
import { Button } from "../styles/components";
import { listAdventures } from "../api/adventures";
import { getTripColor } from "../styles/mapTheme";
import MapView from "../components/MapView";
import { buildMapLayersForAllTrips } from "../utils/mapData";
import { listAirports, listDestinations } from "../api/destinations";

const MAP_VIEWS = [
	{ id: "trips", label: "Trips" },
	{ id: "airports", label: "Airports visited" },
	{ id: "cities", label: "Cities visited" },
];

const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;



function MapPage() {
	const [loading, setLoading] = useState(true);
	const [trips, setTrips] = useState([]);
	const [nodesByTrip, setNodesByTrip] = useState({});
	const [legsByTrip, setLegsByTrip] = useState({});
	const [stopsByTrip, setStopsByTrip] = useState({});
	const [adventures, setAdventures] = useState([]); // global adventures (no trip_id)
	const [carPolylineByLeg, setCarPolylineByLeg] = useState({});
	const [flightPolylineByLeg, setFlightPolylineByLeg] = useState({});
	const [totalMiles, setTotalMiles] = useState(0);
	const [totalDestinations, setTotalDestinations] = useState(0);
	const [totalCountries, setTotalCountries] = useState(0);
	const [highlightMode, setHighlightMode] = useState("off"); // off | countries | states
	const [focusTripId, setFocusTripId] = useState(null);
	const [mapView, setMapView] = useState("trips"); // trips | airports | cities
	const [airports, setAirports] = useState(null); // lazy-loaded on first use
	const [cities, setCities] = useState(null);
	const [placesError, setPlacesError] = useState({}); // { airports?: msg, cities?: msg }

	const selectView = (view) => {
		setMapView(view);
		setFocusTripId(null);
	};

	// Airports / cities are only fetched the first time their view is opened
	useEffect(() => {
		let cancelled = false;
		const load = async (loader, setter) => {
			try {
				const rows = await loader();
				if (!cancelled) setter(rows || []);
			} catch (e) {
				console.error(`Failed to load ${mapView}`, e);
				if (!cancelled) { setPlacesError((prev) => ({ ...prev, [mapView]: `Failed to load ${mapView}` })); setter([]); }
			}
		};
		if (mapView === "airports" && airports === null) load(listAirports, setAirports);
		if (mapView === "cities" && cities === null) load(listDestinations, setCities);
		return () => { cancelled = true; };
	}, [mapView, airports, cities]);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			try {
				const tripList = await listTrips();
				if (cancelled) return;
				setTrips(tripList);
				// fetch adventures in parallel (no dependency on trips) 
				try { const adv = await listAdventures(); if (!cancelled) setAdventures(adv); } catch {}
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

				// Road routes (car/bus) and recorded flight tracks across all trips
				const polylines = await loadLegPolylines(Object.values(legsMap).flat());
				if (cancelled) return;
				setCarPolylineByLeg(polylines.carPolylineByLeg);
				setFlightPolylineByLeg(polylines.flightPolylineByLeg);
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

	const { markers, stopMarkers, adventureMarkers, polylines, bounds, nodeById, stopsByNodeId, visitedCountries, visitedStates } = useMemo(() =>
		buildMapLayersForAllTrips({ nodesByTrip, legsByTrip, stopsByTrip, carPolylineByLeg, flightPolylineByLeg, adventures })
	, [nodesByTrip, legsByTrip, stopsByTrip, carPolylineByLeg, flightPolylineByLeg, adventures]);

	// Place markers + bounds for the airports / cities views
	const placeView = useMemo(() => {
		if (mapView === "trips") return null;
		const rows = (mapView === "airports" ? airports : cities) || [];
		const placeMarkers = rows
			.filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
			.map((r) => ({
				key: r.key,
				name: r.name,
				code: r.code,
				pos: [r.latitude, r.longitude],
				trips: r.trips,
				countLabel: mapView === "airports"
					? plural(r.visit_count, "visit")
					: plural(r.trips?.length || 0, "trip"),
			}));
		const placeBounds = placeMarkers.length ? L.latLngBounds(placeMarkers.map((m) => m.pos)) : bounds;
		return { placeMarkers, placeBounds, loaded: (mapView === "airports" ? airports : cities) !== null };
	}, [mapView, airports, cities, bounds]);

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
			
			<Flex gap={2} style={{ marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
				<Text variant="muted">View:</Text>
				{MAP_VIEWS.map((v) => (
					<Button key={v.id} variant="ghost" onClick={() => selectView(v.id)} disabled={mapView === v.id}>{v.label}</Button>
				))}
				{placeView && (
					<Text variant="muted">
						{placesError[mapView] || (!placeView.loaded
							? "Loading…"
							: mapView === "airports"
								? plural(placeView.placeMarkers.length, "airport")
								: plural(placeView.placeMarkers.length, "city", "cities"))}
					</Text>
				)}
			</Flex>

			<div style = {{height: "70vh"}}>
				<MapView
					markers={placeView ? [] : markers}
					stopMarkers={placeView ? [] : stopMarkers}
					adventureMarkers={placeView ? [] : adventureMarkers}
					placeMarkers={placeView ? placeView.placeMarkers : []}
					polylines={placeView ? [] : polylines}
					bounds={placeView ? placeView.placeBounds : bounds}
					highlightMode={highlightMode}
					nodeById={nodeById}
					stopsByNodeId={stopsByNodeId}
					visitedCountries={visitedCountries}
					visitedStates={visitedStates}
					pathForTripId={(id) => `/trip/${id}`}
					linkLabel="View trip"
					focusTripId={focusTripId}
				/>
			</div>

			{mapView === "trips" && <Flex gap={2} style={{ marginTop: 12, flexWrap: "wrap" }}>
				{trips.map((t) => (
					<Button
						key={t.id}
						onClick={() => setFocusTripId(focusTripId === t.id ? null : t.id)}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							background: 'transparent',
							border: `1px solid var(--border-color, #444)`,
							padding: '4px 8px',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: '0.75rem',
							opacity: focusTripId && focusTripId !== t.id ? 0.3 : 1
						}}
						title={focusTripId === t.id ? 'Clear focus' : 'Focus this trip'}
					>
						<span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 9999, background: getTripColor(t.id) }} />
						<Badge variant="invisible" style={{ border: 'none', padding: 0 }}>{t.name}</Badge>
					</Button>
				))}
			</Flex>}
			
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
 
