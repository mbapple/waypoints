import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Button, Text } from "../../styles/components";
import { getCityStatus, backfillCities } from "../../api/cities";

// Settings section: look up the city for existing nodes/stops that lack one,
// a few rows per request, streaming each outcome into a log.

const Log = styled.div`
  margin-top: ${p => p.theme.space[3]};
  max-height: 260px;
  overflow-y: auto;
  padding: ${p => p.theme.space[2]} ${p => p.theme.space[3]};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.base};
  background: ${p => p.theme.colors.backgroundSecondary};
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: ${p => p.theme.fontSizes.xs};
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`;

const LABEL = { nodes: "Node", stops: "Stop" };
const totalMissing = (m) => (m ? Object.values(m).reduce((a, b) => a + b, 0) : null);

function describe(r) {
  const what = `${LABEL[r.table] || r.table} #${r.id} ${r.name ? `"${r.name}"` : ""}`.trim();
  if (r.status === "found") return { text: `✓ ${what} → ${r.city}`, variant: "success" };
  if (r.status === "none") return { text: `– ${what}: no city here`, variant: "muted" };
  return { text: `✗ ${what}: ${r.error || "lookup failed"}`, variant: "danger" };
}

export default function CityBackfill() {
  const [missing, setMissing] = useState(null); // { nodes, stops }
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState([]);
  const stopRef = useRef(false);
  const logRef = useRef(null);

  const refreshStatus = useCallback(() => {
    getCityStatus().then((s) => setMissing(s.missing)).catch(() => setMissing(null));
  }, []);

  useEffect(() => {
    refreshStatus();
    return () => { stopRef.current = true; }; // stop a running backfill when leaving the page
  }, [refreshStatus]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const add = (entries) => setLines((prev) => [...prev, ...entries]);

  const run = async () => {
    stopRef.current = false;
    setRunning(true);
    setLines([{ text: "Starting…", variant: "muted" }]);
    const tally = { found: 0, none: 0, error: 0 };
    let cursor = {};
    try {
      while (cursor && !stopRef.current) {
        const res = await backfillCities(cursor);
        res.results.forEach((r) => { tally[r.status] = (tally[r.status] || 0) + 1; });
        add(res.results.map(describe));
        setMissing(res.missing);
        cursor = res.next;
      }
      add([{
        text: `${stopRef.current ? "Stopped" : "Done"}: ${tally.found} found, ${tally.none} without a city, ${tally.error} failed.`,
        variant: tally.error ? "warning" : "secondary",
      }]);
    } catch (e) {
      add([{ text: `✗ ${e?.response?.data?.detail || e?.message || "Backfill failed"}`, variant: "danger" }]);
    } finally {
      setRunning(false);
    }
  };

  const count = totalMissing(missing);
  return (
    <>
      <h2>Visited cities</h2>
      <Text variant="muted" size="sm" style={{ display: "block", marginBottom: 8 }}>
        The Cities map view groups nodes and stops by the city they're in, looked up on OpenStreetMap
        when they're saved. Fix older places here. Lookups run about one per second.
      </Text>
      <Text size="sm" style={{ display: "block", marginBottom: 8 }}>
        {count === null
          ? "Checking…"
          : count === 0
            ? "Every place with coordinates has a city."
            : `${count} place${count === 1 ? "" : "s"} without a city (${missing.nodes} nodes, ${missing.stops} stops).`}
      </Text>
      {running ? (
        <Button type="button" variant="outline" onClick={() => { stopRef.current = true; }}>Stop</Button>
      ) : (
        <Button type="button" variant="primary" onClick={run} disabled={count === 0}>Look up missing cities</Button>
      )}
      {lines.length > 0 && (
        <Log ref={logRef} aria-live="polite">
          {lines.map((l, i) => (
            <Text key={i} variant={l.variant} style={{ display: "block", fontSize: "inherit" }}>{l.text}</Text>
          ))}
        </Log>
      )}
    </>
  );
}
