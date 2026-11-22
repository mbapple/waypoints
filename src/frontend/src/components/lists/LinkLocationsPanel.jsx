import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Badge, Button, Flex, Text } from "../../styles/components";
import { PlaceSearchInput, searchNominatimFirst, lookupNominatimOsmIds } from "../map-integration-components";
import { saveListLocations } from "../../api/lists";

// Link list items to map locations. Items without a saved location are searched
// on Nominatim (first result autofilled); any row can be changed or cleared.
// Nothing is written until Save.

const NOMINATIM_SPACING_MS = 1100; // Nominatim usage policy: max 1 request per second
const LOOKUP_BATCH = 50; // Nominatim /lookup accepts up to 50 ids

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(110px, 1fr) 2fr auto;
  gap: ${p => p.theme.space[3]};
  align-items: start;
  padding: ${p => p.theme.space[2]} 0;
  border-bottom: 1px solid ${p => p.theme.colors.border};

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
    gap: ${p => p.theme.space[1]};
  }
`;

const Actions = styled(Flex)`
  gap: ${p => p.theme.space[1]};
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    justify-content: flex-start;
  }
`;

const Footer = styled.div`
  position: sticky;
  bottom: 0;
  margin-top: ${p => p.theme.space[3]};
  padding-top: ${p => p.theme.space[3]};
  background: ${p => p.theme.colors.surface};
  border-top: 1px solid ${p => p.theme.colors.border};
  display: flex;
  flex-wrap: wrap;
  gap: ${p => p.theme.space[2]};
  align-items: center;
  justify-content: space-between;
`;

const STATUS = {
  saved: { label: "Saved", variant: "success" },
  auto: { label: "Auto", variant: "primary" },
  edited: { label: "Edited", variant: "warning" },
  none: { label: "No result", variant: "danger" },
  queued: { label: "Queued", variant: undefined },
  searching: { label: "Searching…", variant: undefined },
  cleared: { label: "Not linked", variant: undefined },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Name lists may hold regex patterns ("^Paris$"); search on the plain words
const searchText = (item, matchType) =>
  matchType === "name" || matchType === "osm_name"
    ? item.replace(/[\^$\\.*+?()[\]{}|]/g, " ").replace(/\s+/g, " ").trim()
    : item.trim();

const savedToPlace = (loc) => ({
  name: loc.osm_name || "",
  lat: loc.latitude,
  lon: loc.longitude,
  osm_id: loc.osm_id,
  osm_country: loc.osm_country,
  osm_state: loc.osm_state,
});

export default function LinkLocationsPanel({ list, onSaved }) {
  const matchType = list?.list?.match_type;
  const listId = list?.list?.id;
  const items = useMemo(() => list?.list?.items || [], [list]);

  const [rows, setRows] = useState(() => {
    const saved = list?.locations || {};
    return Object.fromEntries(items.map((it) => [
      it,
      saved[it] ? { place: savedToPlace(saved[it]), status: "saved" } : { place: null, status: "queued" },
    ]));
  });
  const [editing, setEditing] = useState(null); // item whose search box is open
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", error: false });

  const setRow = (item, patch) => setRows((prev) => ({ ...prev, [item]: { ...prev[item], ...patch } }));

  // All Nominatim calls go through one spaced, abortable queue
  const chainRef = useRef(Promise.resolve());
  const abortRef = useRef(null);
  const enqueue = useCallback((task) => {
    const signal = abortRef.current?.signal;
    chainRef.current = chainRef.current.then(async () => {
      if (!signal || signal.aborted) return;
      try { await task(signal); } catch (e) { if (e?.name !== "AbortError") console.error(e); }
      await sleep(NOMINATIM_SPACING_MS);
    });
  }, []);

  const searchItem = useCallback((item) => {
    setRow(item, { status: "queued" });
    enqueue(async (signal) => {
      const q = searchText(item, matchType);
      if (!q) { setRow(item, { place: null, status: "none" }); return; }
      setRow(item, { status: "searching" });
      try {
        const place = matchType === "osm_id"
          ? (await lookupNominatimOsmIds([item.trim()], { signal }))[item.trim()] || null
          : await searchNominatimFirst(q, { signal });
        if (!signal.aborted) setRow(item, { place, status: place ? "auto" : "none" });
      } catch (e) {
        if (!signal.aborted) setRow(item, { place: null, status: "none" });
        throw e;
      }
    });
  }, [enqueue, matchType]);

  // Autofill every item without a saved location (once per open)
  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    const pending = items.filter((it) => !list?.locations?.[it]);
    if (matchType === "osm_id") {
      for (let i = 0; i < pending.length; i += LOOKUP_BATCH) {
        const batch = pending.slice(i, i + LOOKUP_BATCH);
        enqueue(async (signal) => {
          setRows((prev) => {
            const next = { ...prev };
            batch.forEach((it) => { next[it] = { ...next[it], status: "searching" }; });
            return next;
          });
          let found = {};
          try { found = await lookupNominatimOsmIds(batch.map((it) => it.trim()), { signal }); }
          finally {
            if (!signal.aborted) {
              setRows((prev) => {
                const next = { ...prev };
                batch.forEach((it) => {
                  const place = found[it.trim()] || null;
                  next[it] = { place, status: place ? "auto" : "none" };
                });
                return next;
              });
            }
          }
        });
      }
    } else {
      pending.forEach((it) => searchItem(it));
    }
    return () => ac.abort();
    // Runs once per open; rows keep their own state afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const vals = Object.values(rows);
    return {
      linked: vals.filter((r) => r.place).length,
      pending: vals.filter((r) => r.status === "queued" || r.status === "searching").length,
    };
  }, [rows]);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: "", error: false });
    try {
      const locations = items
        .filter((it) => rows[it]?.place)
        .map((it) => {
          const p = rows[it].place;
          return {
            item: it,
            latitude: Number(p.lat),
            longitude: Number(p.lon),
            osm_id: p.osm_id || null,
            osm_name: p.name || null,
            osm_country: p.osm_country || null,
            osm_state: p.osm_state || null,
          };
        });
      await saveListLocations(listId, locations);
      setRows((prev) => Object.fromEntries(Object.entries(prev).map(([it, r]) => [
        it, r.place ? { ...r, status: "saved" } : r,
      ])));
      setMessage({ text: `Saved ${locations.length} location${locations.length === 1 ? "" : "s"}.`, error: false });
      onSaved?.();
    } catch (e) {
      setMessage({ text: e?.response?.data?.detail || e?.message || "Save failed", error: true });
    } finally {
      setSaving(false);
    }
  };

  if (!items.length) return <Text variant="muted">This list has no items.</Text>;

  return (
    <div>
      <Text variant="muted" size="sm" style={{ display: "block", marginBottom: 8 }}>
        The first OpenStreetMap result is filled in for each item. Use Change to correct a row.
        These coordinates are used for the list's map view.
      </Text>

      {items.map((it) => {
        const r = rows[it] || { place: null, status: "queued" };
        const st = STATUS[r.status] || STATUS.queued;
        const p = r.place;
        return (
          <Row key={it}>
            <div style={{ minWidth: 0 }}>
              <Text weight="semibold" style={{ wordBreak: "break-word" }}>{it}</Text>
              <div><Badge variant={st.variant} style={{ marginTop: 4 }}>{st.label}</Badge></div>
            </div>
            <div style={{ minWidth: 0 }}>
              {p ? (
                <>
                  <Text size="sm" weight="semibold" style={{ display: "block" }}>
                    {(p.name || "").split(",")[0] || it}
                  </Text>
                  {p.name && <Text size="xs" variant="muted" style={{ display: "block", wordBreak: "break-word" }}>{p.name}</Text>}
                  <Text size="xs" variant="muted" style={{ display: "block" }}>
                    {Number(p.lat).toFixed(4)}, {Number(p.lon).toFixed(4)}
                  </Text>
                </>
              ) : (
                <Text size="sm" variant="muted">
                  {r.status === "searching" || r.status === "queued" ? "Searching…" : "No location"}
                </Text>
              )}
              {editing === it && (
                <div style={{ marginTop: 6 }}>
                  <PlaceSearchInput
                    placeholder={`Search for ${searchText(it, matchType) || "a place"}…`}
                    onPlaceSelect={(place) => { setRow(it, { place, status: "edited" }); setEditing(null); }}
                  />
                </div>
              )}
            </div>
            <Actions>
              <Button size="sm" variant="outline" onClick={() => setEditing(editing === it ? null : it)}>
                {editing === it ? "Close" : "Change"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => searchItem(it)} disabled={r.status === "queued" || r.status === "searching"}>
                Search again
              </Button>
              {p && (
                <Button size="sm" variant="ghost" onClick={() => setRow(it, { place: null, status: "cleared" })}>Clear</Button>
              )}
            </Actions>
          </Row>
        );
      })}

      <Footer>
        <Text variant={message.error ? "danger" : "muted"} size="sm">
          {message.text || (counts.pending
            ? `Searching… ${items.length - counts.pending} / ${items.length}`
            : `${counts.linked} / ${items.length} linked`)}
        </Text>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : counts.pending ? "Save (searches still running)" : "Save"}
        </Button>
      </Footer>
    </div>
  );
}
