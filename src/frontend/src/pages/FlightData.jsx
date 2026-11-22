import React, { useEffect, useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/page-components";
import { Button, Card, Text } from "../styles/components";
import MapView from "../components/MapView";
import FlightStats from "../components/flights/FlightStats";
import FlightGroupList from "../components/flights/FlightGroupList";
import { listFlights } from "../api/flights";
import { GROUPINGS, groupFlights, flightStats } from "../utils/flightGroups";
import { flightMapLayers } from "../utils/mapData";

// List panel beside the map; on narrow screens the map comes first
const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: ${p => p.theme.space[4]};
  height: 70vh;
  min-height: 420px;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    height: auto;
  }
`;

const Panel = styled(Card)`
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${p => p.theme.space[2]};
  padding: ${p => p.theme.space[3]};
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const Scroll = styled.div`
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: ${p => p.theme.colors.border} transparent;
`;

const MapPane = styled.div`
  min-height: 0;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    order: -1;
    height: 45vh;
  }
`;

export default function FlightData() {
  const theme = useTheme();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("types");
  const [selected, setSelected] = useState(null); // group key ('' is the Unknown group)

  useEffect(() => {
    let active = true;
    listFlights()
      .then(data => { if (active) setFlights(data || []); })
      .catch(() => { if (active) setError("Could not load flights."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => flightStats(flights), [flights]);
  const groups = useMemo(() => groupFlights(flights, tab), [flights, tab]);
  const selectedGroup = useMemo(() => groups.find(g => g.key === selected) || null, [groups, selected]);
  const map = useMemo(() => flightMapLayers(
    flights,
    new Set((selectedGroup?.flights || []).map(f => f.leg_id)),
    { base: theme.colors.secondary, highlight: theme.colors.accent },
  ), [flights, selectedGroup, theme]);

  const changeTab = (id) => { setTab(id); setSelected(null); };
  const toggle = (key) => setSelected(prev => (prev === key ? null : key));

  return (
    <div>
      <PageHeader>
        <h1>Flight Data</h1>
        <Text>Airlines and aircraft you've flown. Select one to highlight its flights on the map.</Text>
      </PageHeader>

      {loading && <Text variant="muted">Loading flights…</Text>}
      {error && <Text variant="danger">{error}</Text>}
      {!loading && !error && flights.length === 0 && (
        <Card>
          <Text variant="muted">No flights yet. Add a flight leg to a trip, or <Link to="/create/quick">quick-create a trip</Link>.</Text>
        </Card>
      )}

      {flights.length > 0 && (
        <>
          <FlightStats stats={stats} />
          <Layout>
            <Panel>
              <Tabs role="tablist">
                {Object.entries(GROUPINGS).map(([id, g]) => (
                  <Button key={id} type="button" size="sm" role="tab" aria-selected={id === tab}
                    variant={id === tab ? "primary" : "outline"} onClick={() => changeTab(id)}>
                    {g.label}
                  </Button>
                ))}
              </Tabs>
              <Scroll>
                <FlightGroupList groups={groups} selectedKey={selected} onSelect={toggle} expandable={tab !== "flights"} />
              </Scroll>
            </Panel>
            <MapPane>
              <MapView polylines={map.polylines} placeMarkers={map.airports} bounds={map.bounds} />
            </MapPane>
          </Layout>
        </>
      )}
    </div>
  );
}
