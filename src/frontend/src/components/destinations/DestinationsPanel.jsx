import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { Button, Badge, Checkbox, Flex, Input, Text } from "../../styles/components";
import { PlaceSearchInput } from "../map-integration-components";
import { listDestinations, mergeDestinations } from "../../api/destinations";

// Unique destinations list with a merge mode: select destinations, press Merge,
// pick the place to keep (one of the selected, or an OSM search result), confirm.

const Row = styled.label`
  display: flex;
  align-items: flex-start;
  gap: ${p => p.theme.space[3]};
  padding: ${p => p.theme.space[2]} 0;
  border-bottom: 1px solid ${p => p.theme.colors.border};
  cursor: ${p => (p.$selectable ? "pointer" : "default")};
`;

const RowMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${p => p.theme.space[2]};

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const TripLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${p => p.theme.space[1]} ${p => p.theme.space[3]};
  margin-top: ${p => p.theme.space[1]};
  font-size: ${p => p.theme.fontSizes.sm};
`;

const Footer = styled.div`
  position: sticky;
  bottom: 0;
  margin-top: ${p => p.theme.space[3]};
  padding: ${p => p.theme.space[3]} 0 0;
  background: ${p => p.theme.colors.surface};
  border-top: 1px solid ${p => p.theme.colors.border};
  display: flex;
  flex-wrap: wrap;
  gap: ${p => p.theme.space[2]};
  align-items: center;
  justify-content: space-between;
`;

const Notice = styled.div`
  margin-bottom: ${p => p.theme.space[3]};
  padding: ${p => p.theme.space[2]} ${p => p.theme.space[3]};
  border-radius: ${p => p.theme.radii.base};
  border: 1px solid ${p => (p.$error ? p.theme.colors.danger : p.theme.colors.border)};
  background: ${p => p.theme.colors.surfaceHover};
`;

const Radio = styled.input.attrs({ type: "radio" })`
  margin-top: 3px;
  width: 18px;
  height: 18px;
  accent-color: ${p => p.theme.colors.primary};
  cursor: pointer;
`;

const SEARCH = "__search__";

const placeLabel = (d) => [d.osm_state, d.osm_country].filter(Boolean).join(", ");

const rowToTarget = (d) => ({
  name: d.name || d.osm_name,
  osm_id: d.osm_id,
  osm_name: d.osm_name || null,
  osm_country: d.osm_country || null,
  osm_state: d.osm_state || null,
  latitude: d.latitude,
  longitude: d.longitude,
});

// PlaceSearchInput result -> merge target
const searchToTarget = (place) => ({
  name: (place.name || "").split(",")[0].trim() || place.name,
  osm_id: place.osm_id,
  osm_name: place.name || null,
  osm_country: place.osm_country || null,
  osm_state: place.osm_state || null,
  latitude: place.lat,
  longitude: place.lon,
});

export default function DestinationsPanel({ onMerged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState("list"); // list | select | target
  const [selected, setSelected] = useState(() => new Set()); // destination keys
  const [targetKey, setTargetKey] = useState(null); // a selected key or SEARCH
  const [searchedPlace, setSearchedPlace] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mergeError, setMergeError] = useState("");
  const [result, setResult] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setRows(await listDestinations());
    } catch (e) {
      console.error(e);
      setLoadError("Failed to load destinations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((d) =>
      [d.name, d.osm_name, d.osm_country, d.osm_state].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [rows, filter]);

  const selectedRows = useMemo(() => rows.filter((d) => selected.has(d.key)), [rows, selected]);
  const targetChoices = selectedRows.filter((d) => d.osm_id && Number.isFinite(d.latitude) && Number.isFinite(d.longitude));

  const target = useMemo(() => {
    if (targetKey === SEARCH) return searchedPlace ? searchToTarget(searchedPlace) : null;
    const row = selectedRows.find((d) => d.key === targetKey);
    return row ? rowToTarget(row) : null;
  }, [targetKey, searchedPlace, selectedRows]);

  // Merging a single destination into itself would change nothing
  const isNoop = !!target && selectedRows.length === 1 && selectedRows[0].osm_id === target.osm_id;
  const affectedNodes = selectedRows.reduce((sum, d) => sum + (d.node_count || 0), 0);

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const resetMerge = () => {
    setMode("list");
    setSelected(new Set());
    setTargetKey(null);
    setSearchedPlace(null);
    setMergeError("");
  };

  const startTargetStep = () => {
    setMergeError("");
    setResult("");
    setTargetKey(targetChoices[0]?.key ?? SEARCH);
    setMode("target");
  };

  const confirmMerge = async () => {
    if (!target || isNoop) return;
    setBusy(true);
    setMergeError("");
    try {
      const res = await mergeDestinations({
        sources: {
          osm_ids: selectedRows.filter((d) => d.osm_id).map((d) => d.osm_id),
          node_ids: selectedRows.filter((d) => !d.osm_id && d.node_id).map((d) => d.node_id),
        },
        target,
      });
      setResult(
        `Merged ${selectedRows.length} destination${selectedRows.length === 1 ? "" : "s"} into ${target.name}: ` +
        `${res.nodes_updated} nodes, ${res.legs_updated} legs, ${res.lists_updated} lists updated.`
      );
      resetMerge();
      await load();
      onMerged?.();
    } catch (e) {
      setMergeError(e?.response?.data?.detail || e?.message || "Merge failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) return <Text variant="muted">Loading destinations…</Text>;
  if (loadError) return <Text variant="danger">{loadError}</Text>;

  // ---- Step 2: choose the place to keep ----
  if (mode === "target") {
    return (
      <div>
        <Text weight="semibold" style={{ display: "block", marginBottom: 8 }}>Choose the place to keep</Text>
        {targetChoices.map((d) => (
          <Row key={d.key} $selectable>
            <Radio name="merge-target" checked={targetKey === d.key} onChange={() => setTargetKey(d.key)} />
            <RowMain>
              <div>
                <Text weight="semibold">{d.name}</Text>
                <Text variant="muted" size="sm" style={{ display: "block" }}>
                  {d.osm_name || d.osm_id}
                </Text>
              </div>
              <Badge>{d.node_count} node{d.node_count === 1 ? "" : "s"}</Badge>
            </RowMain>
          </Row>
        ))}
        <Row as="div">
          <Radio name="merge-target" checked={targetKey === SEARCH} onChange={() => setTargetKey(SEARCH)} />
          <RowMain style={{ flexDirection: "column", alignItems: "stretch" }}>
            <Text weight="semibold" style={{ cursor: "pointer" }} onClick={() => setTargetKey(SEARCH)}>Search for a different place</Text>
            {targetKey === SEARCH && (
              <div style={{ marginTop: 6 }}>
                <PlaceSearchInput onPlaceSelect={setSearchedPlace} placeholder="Search OpenStreetMap…" />
              </div>
            )}
          </RowMain>
        </Row>

        {target && (
          <Notice>
            <Text size="sm">
              {affectedNodes} node{affectedNodes === 1 ? "" : "s"} (plus any hidden nodes at the same place) will be renamed to{" "}
              <strong>{target.name}</strong> and moved to {Number(target.latitude).toFixed(4)}, {Number(target.longitude).toFixed(4)}
              {target.osm_country ? ` (${[target.osm_state, target.osm_country].filter(Boolean).join(", ")})` : ""}.
              Leg endpoints at these nodes move too; leg miles are not recalculated.
            </Text>
          </Notice>
        )}
        {isNoop && <Text variant="warning" size="sm">Select another destination or search for a new place: merging a destination into itself changes nothing.</Text>}
        {mergeError && <Notice $error><Text variant="danger" size="sm">{mergeError}</Text></Notice>}

        <Footer>
          <Button variant="ghost" onClick={() => setMode("select")} disabled={busy}>Back</Button>
          <Button variant="danger" onClick={confirmMerge} disabled={busy || !target || isNoop}>
            {busy ? "Merging…" : "Confirm merge"}
          </Button>
        </Footer>
      </div>
    );
  }

  // ---- List / selection ----
  const selecting = mode === "select";
  return (
    <div>
      {result && <Notice><Text size="sm">{result}</Text></Notice>}
      <Input
        type="search"
        placeholder="Filter destinations…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      {visibleRows.length === 0 && <Text variant="muted">No destinations match.</Text>}
      {visibleRows.map((d) => (
        <Row key={d.key} $selectable={selecting}>
          {selecting && (
            <Checkbox checked={selected.has(d.key)} onChange={() => toggle(d.key)} style={{ marginTop: 2, flexShrink: 0 }} />
          )}
          <RowMain>
            <div style={{ minWidth: 0 }}>
              <Text weight="semibold">{d.name || d.osm_name || "Unnamed"}</Text>
              {placeLabel(d) && <Text variant="muted" size="sm" style={{ display: "block" }}>{placeLabel(d)}</Text>}
              {!d.osm_id && <Text variant="warning" size="sm" style={{ display: "block" }}>No OSM place</Text>}
              {!selecting && d.trips?.length > 0 && (
                <TripLinks>
                  {d.trips.map((t) => <Link key={t.id} to={`/trip/${t.id}`}>{t.name}</Link>)}
                </TripLinks>
              )}
            </div>
            <Badge variant="primary" style={{ flexShrink: 0 }}>
              {d.trips?.length || 0} trip{d.trips?.length === 1 ? "" : "s"}
            </Badge>
          </RowMain>
        </Row>
      ))}

      <Footer>
        {selecting ? (
          <>
            <Text variant="muted">{selected.size} selected</Text>
            <Flex gap={2}>
              <Button variant="ghost" onClick={resetMerge}>Cancel</Button>
              <Button variant="primary" onClick={startTargetStep} disabled={selected.size === 0}>Merge</Button>
            </Flex>
          </>
        ) : (
          <>
            <Text variant="muted">{rows.length} destinations</Text>
            <Button variant="outline" onClick={() => { setResult(""); setMode("select"); }}>Merge mode</Button>
          </>
        )}
      </Footer>
    </div>
  );
}
