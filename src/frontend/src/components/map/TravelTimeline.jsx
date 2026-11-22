import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Button, Flex, Select, Text } from "../../styles/components";
import { PlayIcon, PauseIcon } from "../common/Icons";
import { getTripColor } from "../../styles/mapTheme";
import { fmtLong, fmtTripRange } from "../../utils/itinerary";
import { DAY_MS } from "../../utils/timeline";
import { TIMELINE_SPEEDS } from "../../utils/useTimelinePlayback";

const toDate = (t) => new Date(Math.floor(t / DAY_MS) * DAY_MS).toISOString().slice(0, 10);
const plural = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// Year labels for long spans, month labels for short ones, thinned to fit the track width
function axisLabels(min, domainEnd, width) {
  const span = domainEnd - min;
  if (!width || span <= 0) return [];
  const px = (t) => ((t - min) / span) * width;
  const out = [];
  const first = new Date(min);
  if (span > 540 * DAY_MS) {
    const yearPx = ((365.25 * DAY_MS) / span) * width;
    const step = [1, 2, 5, 10, 20, 50].find((s) => s * yearPx >= 44) || 100;
    for (let y = Math.ceil((first.getUTCFullYear() + 1) / step) * step; Date.UTC(y, 0, 1) < domainEnd; y += step) {
      out.push({ t: Date.UTC(y, 0, 1), label: String(y) });
    }
    if (!out.length || px(out[0].t) >= 44) out.unshift({ t: min, label: String(first.getUTCFullYear()) });
  } else {
    const monthPx = ((30.44 * DAY_MS) / span) * width;
    const step = [1, 2, 3, 6, 12].find((s) => s * monthPx >= 56) || 12;
    const label = (t) => {
      const d = new Date(t);
      const month = d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
      return d.getUTCMonth() === 0 ? `${month} ${d.getUTCFullYear()}` : month;
    };
    for (let i = 1; ; i += 1) {
      const t = Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, 1);
      if (t >= domainEnd) break;
      if (new Date(t).getUTCMonth() % step === 0) out.push({ t, label: label(t) });
    }
    if (!out.length || px(out[0].t) >= 64) {
      out.unshift({ t: min, label: first.toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" }) });
    }
  }
  return out.filter((l) => px(l.t) <= width - 28).map((l) => ({ ...l, x: px(l.t) }));
}

export default function TravelTimeline({
  features, extent, range, displayRange, trips = [], undatedCount = 0,
  shownCount, totalCount, playing, inPlay, speed, setSpeed, play, pause, setRange, reset,
}) {
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [extent]);

  const min = extent?.min ?? 0;
  const domainEnd = (extent?.max ?? 0) + DAY_MS; // the last day is drawn with its full width
  const span = domainEnd - min || DAY_MS;
  const pct = (t) => `${((t - min) / span) * 100}%`;

  // One tick per trip per day
  const ticks = useMemo(() => {
    const seen = new Map();
    features.forEach((f) => {
      const key = `${f.tripId ?? "adv"}|${f.t}`;
      if (!seen.has(key)) seen.set(key, { key, t: f.t, tripId: f.tripId });
    });
    return [...seen.values()];
  }, [features]);

  // Each trip's dated span on the timeline
  const bands = useMemo(() => {
    const names = new Map(trips.map((t) => [Number(t.id), t.name]));
    const spans = new Map();
    features.forEach((f) => {
      if (f.tripId == null) return;
      const s = spans.get(f.tripId);
      if (!s) spans.set(f.tripId, { tripId: f.tripId, start: f.t, end: f.t, name: names.get(f.tripId) || "Trip" });
      else { s.start = Math.min(s.start, f.t); s.end = Math.max(s.end, f.t); }
    });
    return [...spans.values()];
  }, [features, trips]);

  const labels = useMemo(() => axisLabels(min, domainEnd, width), [min, domainEnd, width]);

  if (!extent || !range) {
    return (
      <Wrapper>
        <Text variant="muted">Nothing with a date to show on the timeline yet.</Text>
      </Wrapper>
    );
  }

  const shown = displayRange || range;
  const isFull = range.start === extent.min && range.end === extent.max;

  // ---- Dragging: handles resize the window, the body pans it, the bare track moves the nearest edge ----
  const timeAt = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    return min + clamp((clientX - rect.left) / rect.width, 0, 1) * span;
  };
  const applyDrag = (clientX) => {
    const d = dragRef.current;
    if (!d) return;
    const t = timeAt(clientX);
    if (d.mode === "start") setRange({ start: Math.min(t, d.orig.end), end: d.orig.end });
    else if (d.mode === "end") setRange({ start: d.orig.start, end: Math.max(t - DAY_MS, d.orig.start) });
    else {
      const delta = clamp(t - d.t0, extent.min - d.orig.start, extent.max - d.orig.end);
      setRange({ start: d.orig.start + delta, end: d.orig.end + delta });
    }
  };
  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    let mode = e.target.closest("[data-drag]")?.dataset.drag;
    const t = timeAt(e.clientX);
    if (!mode) mode = Math.abs(t - range.start) <= Math.abs(t - (range.end + DAY_MS)) ? "start" : "end";
    dragRef.current = { mode, t0: t, orig: range };
    trackRef.current.setPointerCapture?.(e.pointerId);
    if (mode !== "body") applyDrag(e.clientX);
    e.preventDefault();
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    // Panning only starts once the pointer actually moves, so a click on the window does nothing
    if (d.mode === "body" && !d.moved && Math.abs(timeAt(e.clientX) - d.t0) < DAY_MS / 2) return;
    d.moved = true;
    applyDrag(e.clientX);
  };
  const endDrag = () => { dragRef.current = null; };

  const onHandleKey = (edge) => (e) => {
    const step = (e.shiftKey ? 30 : 1) * DAY_MS;
    let { start, end } = range;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { if (edge === "start") start -= step; else end -= step; }
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") { if (edge === "start") start += step; else end += step; }
    else if (e.key === "Home") { if (edge === "start") start = extent.min; else end = start; }
    else if (e.key === "End") { if (edge === "start") start = end; else end = extent.max; }
    else return;
    e.preventDefault();
    if (edge === "start") start = Math.min(start, end);
    else end = Math.max(end, start);
    setRange({ start, end });
  };

  const startDate = toDate(shown.start);
  const endDate = toDate(shown.end);

  return (
    <Wrapper>
      <Flex gap={2} wrap="wrap" align="center" style={{ marginBottom: 8 }}>
        <Button
          variant="primary"
          onClick={playing ? pause : play}
          aria-label={playing ? "Pause timeline" : "Play timeline"}
          disabled={!features.length}
        >
          {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
          {playing ? "Pause" : inPlay ? "Resume" : "Play"}
        </Button>
        <Select
          aria-label="Playback speed"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          style={{ width: "auto", minWidth: 0 }}
        >
          {TIMELINE_SPEEDS.map((s) => <option key={s} value={s}>{s} per sec</option>)}
        </Select>
        <Button variant="ghost" onClick={reset} disabled={isFull && !inPlay}>Full range</Button>
        <Text variant="muted" size="sm" style={{ marginLeft: "auto" }}>
          {startDate === endDate ? fmtLong(startDate) : `${fmtLong(startDate)} – ${fmtLong(endDate)}`}
          {` · ${shownCount} of ${plural(totalCount, "item")}`}
          {undatedCount > 0 && ` · ${undatedCount} undated not shown`}
        </Text>
      </Flex>

      <Bands>
        {bands.map((b) => (
          <Band
            key={b.tripId}
            type="button"
            title={`${b.name} · ${fmtTripRange(toDate(b.start), toDate(b.end))}`}
            aria-label={`Show ${b.name} on the timeline`}
            onClick={() => setRange({ start: b.start, end: b.end })}
            style={{ left: pct(b.start), width: `calc(${pct(b.end + DAY_MS)} - ${pct(b.start)})`, background: getTripColor(b.tripId) }}
          />
        ))}
      </Bands>

      <Track
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {ticks.map((k) => {
          const inside = k.t >= shown.start && k.t <= shown.end;
          return (
            <Tick
              key={k.key}
              style={{
                left: pct(k.t + DAY_MS / 2),
                background: k.tripId == null ? undefined : getTripColor(k.tripId),
                opacity: inside ? 0.95 : 0.3,
              }}
            />
          );
        })}
        <Window
          data-drag="body"
          style={{ left: pct(shown.start), width: `calc(${pct(shown.end + DAY_MS)} - ${pct(shown.start)})` }}
        >
          <Handle
            data-drag="start"
            $edge="start"
            role="slider"
            tabIndex={0}
            aria-label="Timeline start"
            aria-valuemin={extent.min}
            aria-valuemax={range.end}
            aria-valuenow={range.start}
            aria-valuetext={fmtLong(toDate(range.start))}
            onKeyDown={onHandleKey("start")}
          />
          <Handle
            data-drag="end"
            $edge="end"
            role="slider"
            tabIndex={0}
            aria-label="Timeline end"
            aria-valuemin={range.start}
            aria-valuemax={extent.max}
            aria-valuenow={range.end}
            aria-valuetext={fmtLong(toDate(range.end))}
            onKeyDown={onHandleKey("end")}
          />
        </Window>
      </Track>

      <Axis>
        {labels.map((l) => <AxisLabel key={l.t} style={{ left: l.x }}>{l.label}</AxisLabel>)}
      </Axis>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin-top: ${(p) => p.theme.space[2]};
  padding: ${(p) => p.theme.space[3]};
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.xl};
  /* keep the edge handles inside the card */
  padding-left: calc(${(p) => p.theme.space[3]} + 6px);
  padding-right: calc(${(p) => p.theme.space[3]} + 6px);
`;

const Bands = styled.div`
  position: relative;
  height: 10px;
  margin-bottom: 4px;
`;

const Band = styled.button`
  position: absolute;
  top: 1px;
  height: 8px;
  min-width: 4px;
  padding: 0;
  border: none;
  border-radius: ${(p) => p.theme.radii.full};
  opacity: 0.85;
  cursor: pointer;
  &:hover, &:focus-visible { opacity: 1; outline: 2px solid ${(p) => p.theme.colors.text}; outline-offset: 1px; }
`;

const Track = styled.div`
  position: relative;
  height: 34px;
  background: ${(p) => p.theme.colors.backgroundSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.md};
  cursor: pointer;
  touch-action: none;
  user-select: none;
`;

const Tick = styled.div`
  position: absolute;
  top: 7px;
  bottom: 7px;
  width: 2px;
  margin-left: -1px;
  border-radius: 1px;
  background: ${(p) => p.theme.colors.accent};
  pointer-events: none;
`;

const Window = styled.div`
  position: absolute;
  top: -1px;
  bottom: -1px;
  min-width: 2px;
  background: ${(p) => `${p.theme.colors.accent}2e`};
  border: 1px solid ${(p) => p.theme.colors.accent};
  border-radius: ${(p) => p.theme.radii.base};
  cursor: grab;
  &:active { cursor: grabbing; }
`;

const Handle = styled.div`
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 12px;
  ${(p) => (p.$edge === "start" ? "left: -7px;" : "right: -7px;")}
  background: ${(p) => p.theme.colors.accent};
  border-radius: ${(p) => p.theme.radii.base};
  cursor: ew-resize;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  /* grip lines */
  &::after {
    content: "";
    position: absolute;
    top: 30%;
    bottom: 30%;
    left: 3px;
    right: 3px;
    border-left: 2px solid rgba(0, 0, 0, 0.35);
    border-right: 2px solid rgba(0, 0, 0, 0.35);
  }
  /* bigger touch target */
  &::before {
    content: "";
    position: absolute;
    top: -6px;
    bottom: -6px;
    left: -8px;
    right: -8px;
  }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.text}; outline-offset: 2px; }
`;

const Axis = styled.div`
  position: relative;
  height: 18px;
  margin-top: 4px;
  overflow: hidden;
`;

const AxisLabel = styled.span`
  position: absolute;
  top: 0;
  padding-left: 3px;
  border-left: 1px solid ${(p) => p.theme.colors.border};
  font-size: ${(p) => p.theme.fontSizes.xs};
  color: ${(p) => p.theme.colors.textMuted};
  white-space: nowrap;
  line-height: 18px;
`;
