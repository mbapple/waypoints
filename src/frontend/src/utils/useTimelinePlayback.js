// State and playback for the Map Timeline view.
//
// Outside playback the map shows the features dated inside `range` (whole days, inclusive).
// Play replays that window one feature at a time at a constant `speed` (features per second),
// so long gaps between trips take no longer than busy days. While playing, the window's right
// edge glides between consecutive features' dates.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DAY_MS, layersFromFeatures } from "./timeline";

export const TIMELINE_SPEEDS = [1, 3, 8, 20];
const DEFAULT_SPEED = 3;
const EMPTY = { markers: [], stopMarkers: [], adventureMarkers: [], polylines: [], heads: [] };

const snapDay = (t, min) => min + Math.round((t - min) / DAY_MS) * DAY_MS;

export default function useTimelinePlayback(features) {
  const extent = useMemo(() => (features.length
    ? { min: features[0].t, max: features[features.length - 1].t }
    : null), [features]);

  const [rangeState, setRangeState] = useState(null); // null = full extent
  const [play, setPlay] = useState(null); // { startIdx, endIdx, pos } while in play mode
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const playRef = useRef(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const setPlayState = useCallback((p) => { playRef.current = p; setPlay(p); }, []);
  const stopPlay = useCallback(() => { setPlaying(false); setPlayState(null); }, [setPlayState]);

  // New data (first load) invalidates any range or playback in progress
  useEffect(() => { stopPlay(); setRangeState(null); }, [features, stopPlay]);

  const range = useMemo(() => {
    if (!extent) return null;
    if (!rangeState) return { start: extent.min, end: extent.max };
    const start = Math.min(Math.max(rangeState.start, extent.min), extent.max);
    const end = Math.min(Math.max(rangeState.end, start), extent.max);
    return { start, end };
  }, [extent, rangeState]);

  const setRange = useCallback((r) => {
    stopPlay();
    if (!extent || !r) { setRangeState(null); return; }
    let start = snapDay(r.start, extent.min);
    let end = snapDay(r.end, extent.min);
    start = Math.min(Math.max(start, extent.min), extent.max);
    end = Math.min(Math.max(end, start), extent.max);
    setRangeState(start === extent.min && end === extent.max ? null : { start, end });
  }, [extent, stopPlay]);

  const reset = useCallback(() => setRange(null), [setRange]);

  const play_ = useCallback(() => {
    if (!range || !features.length) return;
    const p = playRef.current;
    if (p && p.pos < p.endIdx + 1) { setPlaying(true); return; } // resume
    let startIdx = features.findIndex((f) => f.t >= range.start);
    let endIdx = -1;
    for (let i = features.length - 1; i >= 0; i -= 1) { if (features[i].t <= range.end) { endIdx = i; break; } }
    if (startIdx < 0 || endIdx < startIdx) { startIdx = 0; endIdx = features.length - 1; }
    setPlayState({ startIdx, endIdx, pos: startIdx });
    setPlaying(true);
  }, [features, range, setPlayState]);

  const pause = useCallback(() => setPlaying(false), []);

  // Animation loop
  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const p = playRef.current;
      if (!p) return;
      // rAF timestamps can precede the performance.now() taken at start (negative dt), and a
      // background tab shouldn't skip ahead, so clamp to [0, 100ms]
      const dt = Math.min(Math.max(now - last, 0), 100);
      last = Math.max(now, last);
      const pos = p.pos + (dt / 1000) * speedRef.current;
      if (pos >= p.endIdx + 1) { stopPlay(); return; } // finished: the window is shown again in full
      setPlayState({ ...p, pos });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, stopPlay, setPlayState]);

  // Visible layers. In play mode the fully drawn part only changes when a whole step completes.
  const shownIdx = play ? Math.floor(play.pos) : null;
  const playStart = play?.startIdx;
  const base = useMemo(() => {
    if (!range) return { layers: EMPTY, count: 0 };
    const list = shownIdx != null
      ? features.slice(playStart, shownIdx)
      : features.filter((f) => f.t >= range.start && f.t <= range.end);
    return { layers: layersFromFeatures(list), count: list.length };
  }, [features, range, shownIdx, playStart]);

  const partialFeature = play && shownIdx <= play.endIdx ? features[shownIdx] : null;
  const frac = play ? play.pos - shownIdx : 0;
  const visible = useMemo(() => {
    if (!partialFeature) return base.layers;
    const extra = layersFromFeatures([], { feature: partialFeature, frac });
    return {
      markers: extra.markers.length ? [...base.layers.markers, ...extra.markers] : base.layers.markers,
      stopMarkers: extra.stopMarkers.length ? [...base.layers.stopMarkers, ...extra.stopMarkers] : base.layers.stopMarkers,
      adventureMarkers: extra.adventureMarkers.length ? [...base.layers.adventureMarkers, ...extra.adventureMarkers] : base.layers.adventureMarkers,
      polylines: extra.polylines.length ? [...base.layers.polylines, ...extra.polylines] : base.layers.polylines,
      heads: extra.heads,
    };
  }, [base, partialFeature, frac]);

  // Window as drawn on the timeline: while playing, the right edge follows the playhead
  const displayRange = useMemo(() => {
    if (!range || !play) return range;
    const i = Math.min(shownIdx, play.endIdx);
    const next = Math.min(i + 1, play.endIdx);
    const k = shownIdx > play.endIdx ? 0 : frac;
    const end = features[i].t + (features[next].t - features[i].t) * k;
    return { start: Math.min(range.start, features[play.startIdx].t), end };
  }, [range, play, shownIdx, frac, features]);

  return {
    features,
    extent,
    range,
    displayRange,
    visible,
    shownCount: base.count + (partialFeature ? 1 : 0),
    totalCount: features.length,
    playing,
    inPlay: !!play,
    playPos: play ? play.pos : null, // float feature index while in play mode
    playStart: play ? play.startIdx : null,
    speed,
    setSpeed,
    play: play_,
    pause,
    setRange,
    reset,
  };
}
