import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/page-components";
import { Text, Flex, Badge, Button } from "../styles/components";
import { getTrip } from "../api/trips";
import { listNodesByTrip } from "../api/nodes";
import { listStopsByTrip } from "../api/stops";
import { listLegsByTrip, getCarDetails } from "../api/legs";
import { useSettings } from "../context/SettingsContext";
import { useTheme } from "styled-components";
import { getTripColor } from "../styles/mapTheme";
import MapView from "../components/MapView";
import { buildMapLayersForTrip } from "../utils/mapData";

function TripMap() {
  const { tripID } = useParams();
  const { settings } = useSettings();
  const theme = useTheme();
  const isDark = (settings?.theme || "dark") === "dark";

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [legs, setLegs] = useState([]);
  const [stops, setStops] = useState([]);
  const [carPolylineByLeg, setCarPolylineByLeg] = useState({});
  const [highlightMode, setHighlightMode] = useState("off"); // off | countries | states

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [t, n, l, s] = await Promise.all([
          getTrip(tripID),
          listNodesByTrip(tripID),
          listLegsByTrip(tripID),
          listStopsByTrip(tripID),
        ]);
        if (cancelled) return;
        setTrip(t);
        setNodes(n);
        setLegs(l);
        setStops(s);

        const carLegs = (l || []).filter((leg) => (leg.type || "").toLowerCase() === "car");
        const pairs = await Promise.all(
          carLegs.map(async (leg) => {
            try {
              const details = await getCarDetails(leg.id);
              return [leg.id, details?.polyline || null];
            } catch {
              return [leg.id, null];
            }
          })
        );
        if (cancelled) return;
        setCarPolylineByLeg(Object.fromEntries(pairs));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to load trip map", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tripID]);

  const { markers, stopMarkers, polylines, bounds, nodeById, visitedCountries, visitedStates } = useMemo(() =>
    buildMapLayersForTrip({ nodes, legs, stops, carPolylineByLeg, tripID })
  , [nodes, legs, stops, carPolylineByLeg, tripID]);

  return (
    <div>
      <PageHeader>
        <Flex justify="space-between" align="center">
          <h1>{trip ? trip.name : "Trip Map"}</h1>
          <Text variant="muted">{loading ? "Loading…" : `${markers.length} places, ${polylines.length} legs`}</Text>
        </Flex>
      </PageHeader>

      <MapView
        isDark={isDark}
        theme={theme}
        markers={markers}
        stopMarkers={stopMarkers}
        polylines={polylines}
        bounds={bounds}
        highlightMode={highlightMode}
        nodeById={nodeById}
  visitedCountries={visitedCountries}
  visitedStates={visitedStates}
        pathForTripId={() => `/trip/${tripID}`}
        linkLabel="View trip details"
      />
     

      <Flex gap={2} style={{ marginTop: 12, flexWrap: "wrap" }}>
        {trip && (
          <Flex align="center" gap={2}>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 9999, background: getTripColor(Number(tripID)) }} />
            <Badge variant="outline">{trip.name}</Badge>
          </Flex>
        )}
      </Flex>

      {/* Selection for highlighting countries/states */}
      <Flex gap={2} style={{ marginTop: 8, alignItems: "center" }}>
        <Text variant="muted">Highlight:</Text>
        <Button  variant="primary" onClick={() => setHighlightMode("off")} disabled={highlightMode === "off"}>Off</Button>
        <Button  variant="primary" onClick={() => setHighlightMode("countries")} disabled={highlightMode === "countries"}>Countries</Button>
        <Button  variant="primary" onClick={() => setHighlightMode("states")} disabled={highlightMode === "states"}>States</Button>
      </Flex>
    </div>
  );
}

export default TripMap;
