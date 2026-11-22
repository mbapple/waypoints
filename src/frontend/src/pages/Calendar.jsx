import React, { useEffect, useState, useMemo, useRef } from 'react';
import useDocumentTitle from "../utils/useDocumentTitle";
import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';
import { listTrips } from '../api/trips';
import { listAdventures } from '../api/adventures';
import { listNodesByTrip } from '../api/nodes';
import { listStopsByTrip } from '../api/stops';
import { listCalendarPhotos } from '../api/photos';
import { API_ORIGIN } from '../api/client';
import { getStopEmoji } from '../styles/mapTheme';
import { Button } from '../styles/components';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADVENTURE_COLOR = '#ec4899';
const DAY_MS = 86400000;
const LANE_HEIGHT = 18; // px, every bar in the month view is one lane tall
const LANE_GAP = 3;     // px between lanes

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ---------------------------------------------------------------------------
// Date helpers. Calendar days are UTC-midnight Dates so day arithmetic is
// unaffected by DST and the browser's time zone.
// ---------------------------------------------------------------------------

function parseISO(str) {
    if (!str) return null;
    const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
}
const dateKey = d => d.toISOString().slice(0, 10);
const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const sameDay = (a, b) => !!a && !!b && a.getTime() === b.getTime();

// Today in the browser's local time zone, as a calendar day.
function localToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// { start, end } from two optional dates: a lone date is one day, reversed dates are swapped.
function dayRange(a, b) {
    const s = parseISO(a || b);
    const e = parseISO(b || a);
    if (!s || !e) return null;
    return s <= e ? { start: s, end: e } : { start: e, end: s };
}

// Node span is arrival → departure. A departure before arrival counts as a one-day visit.
function nodeRange(n) {
    const start = parseISO(n.arrival_date || n.departure_date);
    if (!start) return null;
    const dep = parseISO(n.departure_date);
    return { start, end: dep && dep > start ? dep : start };
}

function intersect(r, bound) {
    if (!r || !bound) return null;
    const start = r.start > bound.start ? r.start : bound.start;
    const end = r.end < bound.end ? r.end : bound.end;
    return start <= end ? { start, end } : null;
}

const overlaps = (r, start, end) => !!r && r.end >= start && r.start <= end;
const rangeDays = r => Math.round((r.end - r.start) / DAY_MS);
const fmtRange = r => sameDay(r.start, r.end) ? dateKey(r.start) : `${dateKey(r.start)} → ${dateKey(r.end)}`;

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

function hashColor(id) { return `hsl(${(id * 57) % 360} 65% 45%)`; }

// Lighter, less saturated version of a trip color (solid) for node bars.
function fadedColor(c) {
    const m = c && c.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
    if (!m) return c;
    const s = Math.max(20, Math.min(100, Number(m[2]) - 15));
    const l = Math.max(15, Math.min(92, Number(m[3]) + 18));
    return `hsl(${m[1]} ${s}% ${l}%)`;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const isHotel = s => (s.category || '').toLowerCase() === 'hotel';

// Multi-day stops first (hotels before others), then by start date.
function stopOrder(a, b) {
    const aMulti = a.range.end > a.range.start;
    const bMulti = b.range.end > b.range.start;
    if (aMulti !== bMulti) return aMulti ? -1 : 1;
    if (aMulti && isHotel(a.stop) !== isHotel(b.stop)) return isHotel(a.stop) ? -1 : 1;
    return (a.range.start - b.range.start) || (a.stop.id - b.stop.id);
}

// Trip itinerary prepared for the month view: visible nodes in date order, each
// with its dated stops, plus stops not under a visible node (leg stops etc.).
function buildTripStructure(nodes, stops) {
    const groups = nodes
        .filter(n => !n.invisible)
        .map(n => ({ node: n, range: nodeRange(n), stops: [] }))
        .filter(g => g.range)
        .sort((a, b) => (a.range.start - b.range.start) || (b.range.end - a.range.end) || (a.node.id - b.node.id));
    const byNode = new Map(groups.map(g => [g.node.id, g]));
    const looseStops = [];
    stops.forEach(s => {
        const range = dayRange(s.start_date, s.end_date);
        if (!range) return;
        (byNode.get(s.node_id)?.stops ?? looseStops).push({ stop: s, range });
    });
    groups.forEach(g => g.stops.sort(stopOrder));
    looseStops.sort(stopOrder);
    return { groups, looseStops };
}

// Lane allocator for one week (7 columns): claims the lowest run of `height`
// consecutive lanes, starting at `minLane`, that is free in columns c0..c1.
function createLanes() {
    const rows = [];
    const isFree = (r, c0, c1) => {
        const row = rows[r];
        if (!row) return true;
        for (let c = c0; c <= c1; c++) if (row[c]) return false;
        return true;
    };
    return {
        get count() { return rows.length; },
        claim(minLane, height, c0, c1) {
            let r = minLane;
            const blockFree = start => {
                for (let h = 0; h < height; h++) if (!isFree(start + h, c0, c1)) return false;
                return true;
            };
            while (!blockFree(r)) r++;
            for (let h = 0; h < height; h++) {
                while (rows.length <= r + h) rows.push(Array(7).fill(false));
                for (let c = c0; c <= c1; c++) rows[r + h][c] = true;
            }
            return r;
        },
    };
}

// Weeks of the month, each 7 cells of Date | null (outside the month).
function buildWeeks(year, month) {
    const lead = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const cells = [
        ...Array(lead).fill(null),
        ...Array.from({ length: daysInMonth(year, month) }, (_, i) => new Date(Date.UTC(year, month, i + 1))),
    ];
    while (cells.length % 7) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
}

// Lay out one week. Each trip is a block of lanes: the trip bar on its first
// lane, nodes below it, and each node's stops below the node. Blocks (and
// single-lane adventures) are then packed into the week's lanes, so every bar
// keeps one lane for all the days it spans in the week.
function layoutWeek(days, trips, adventures, tripDetails) {
    const first = days.findIndex(Boolean);
    const last = days.length - 1 - [...days].reverse().findIndex(Boolean);
    const week = { start: days[first], end: days[last] };
    const clip = r => {
        const c = intersect(r, week);
        if (!c) return null;
        return {
            c0: first + Math.round((c.start - week.start) / DAY_MS),
            c1: first + Math.round((c.end - week.start) / DAY_MS),
        };
    };

    const blocks = [];
    trips.forEach(t => {
        const tc = clip(t.range);
        if (!tc) return;
        const inner = createLanes();
        const items = [];
        const add = (kind, range, minLane, extra) => {
            const c = clip(range);
            if (!c) return null;
            const lane = inner.claim(minLane, 1, c.c0, c.c1);
            items.push({ kind, range, lane, ...c, trip: t, ...extra });
            return lane;
        };
        add('trip', t.range, 0, { key: `trip-${t.id}` });
        const details = tripDetails[t.id];
        if (details) {
            details.groups.forEach(g => {
                const nodeLane = add('node', intersect(g.range, t.range), 1, { key: `node-${g.node.id}`, node: g.node });
                g.stops.forEach(s => add('stop', intersect(s.range, t.range), nodeLane == null ? 1 : nodeLane + 1,
                    { key: `stop-${s.stop.id}`, stop: s.stop }));
            });
            details.looseStops.forEach(s => add('stop', intersect(s.range, t.range), 1, { key: `stop-${s.stop.id}`, stop: s.stop }));
        }
        blocks.push({ range: t.range, ...tc, height: inner.count, items, isTrip: true });
    });
    adventures.forEach(a => {
        const c = clip(a.range);
        if (!c) return;
        blocks.push({ range: a.range, ...c, height: 1, isTrip: false,
            items: [{ kind: 'adventure', key: `adv-${a.id}`, range: a.range, lane: 0, ...c, adventure: a }] });
    });

    // Earlier first, then longer, then trips before adventures.
    blocks.sort((a, b) => (a.range.start - b.range.start) || (rangeDays(b.range) - rangeDays(a.range)) || (b.isTrip - a.isTrip));
    const lanes = createLanes();
    const items = [];
    blocks.forEach(b => {
        const base = lanes.claim(0, b.height, b.c0, b.c1);
        b.items.forEach(it => items.push({ ...it, lane: base + it.lane }));
    });
    return { items, laneCount: lanes.count };
}

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const Page = styled.div`
    margin-top: 1.5rem;
`;

const Controls = styled.div`
    display: flex;
    gap: .9rem;
    align-items: center;
    margin-bottom: 1.4rem;
    flex-wrap: wrap;
`;

const Title = styled.h1`
    margin: 0 .5rem;
    font-size: 1.75rem;
    @media (max-width: ${p => p.theme.breakpoints.sm}) { font-size: 1.4rem; margin: 0; }
`;

const Muted = styled.p`
    opacity: .6;
    margin: 0 0 .75rem;
`;

// Year view

const YearGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.25rem;
    align-items: start;
    @media (max-width: ${p => p.theme.breakpoints.lg}) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (max-width: ${p => p.theme.breakpoints.sm}) { grid-template-columns: minmax(0, 1fr); }
`;

const MonthCard = styled.div`
    background: ${p => p.theme.colors.card};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    padding: 0.65rem 0.75rem 0.9rem;
    cursor: pointer;
    transition: ${p => p.theme.transitions.base};
    overflow: hidden;
    &:hover { box-shadow: ${p => p.theme.shadows.lg}; }
`;

const MonthTitle = styled.h3`
    font-size: 1.05rem;
    margin: 0 0 .35rem;
    font-weight: 600;
    letter-spacing: .5px;
`;

const MiniMonthGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    margin-top: .25rem;
`;

const MiniDay = styled.div`
    min-height: 22px;
    font-size: .70rem;
    line-height: 1;
    font-weight: ${p => p.$header ? 600 : 500};
    text-align: center;
    padding: 3px 0 2px;
    position: relative;
    background: ${p => p.$header ? 'transparent' : p.theme.colors.backgroundSecondary};
    opacity: ${p => p.$blank ? 0.35 : 1};
    user-select: none;
    ${p => p.$today && css`
        /* outside the cell so it doesn't hide the inset adventure outline */
        outline: 2px solid ${p.theme.colors.primary};
        outline-offset: 0;
        z-index: 1;
    `}
`;

const MiniDayDots = styled.div`
    position: absolute;
    left: 2px;
    right: 2px;
    bottom: 2px;
    display: flex;
    gap: 2px;
    justify-content: center;
    flex-wrap: wrap;
`;

const Dot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${p => p.$color};
    box-shadow: 0 0 0 1px rgba(255,255,255,.4);
`;

// Month view

const MonthShell = styled.div`
    background: ${p => p.theme.colors.card};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 1.1rem 1.2rem 1.4rem;
    box-shadow: ${p => p.theme.shadows.md};
    @media (max-width: ${p => p.theme.breakpoints.sm}) { padding: .6rem .4rem .8rem; }
`;

const MonthHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: .85rem;
`;

const WeekdayHeader = styled.div`
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    font-size: .85rem;
    font-weight: 700;
    opacity: .75;
    text-align: center;
    padding-bottom: 6px;
    @media (max-width: ${p => p.theme.breakpoints.sm}) { font-size: .7rem; }
`;

const Weeks = styled.div`
    border-top: 1px solid ${p => p.theme.colors.border};
    border-left: 1px solid ${p => p.theme.colors.border};
`;

// One week: row 1 = day numbers, then one row per lane, then a flexible row for photos.
const WeekRow = styled.div`
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    /* repeat(0, …) is invalid CSS, so leave the lane rows out of an empty week */
    grid-template-rows: auto ${p => p.$lanes > 0 ? `repeat(${p.$lanes}, ${LANE_HEIGHT}px)` : ''} minmax(10px, 1fr);
    row-gap: ${LANE_GAP}px;
    min-height: 120px;
    @media (max-width: ${p => p.theme.breakpoints.sm}) { min-height: 80px; }
`;

const DayBackground = styled.div`
    grid-row: 1 / -1;
    background: ${p => p.$blank
        ? p.theme.colors.background
        : p.$today ? p.theme.colors.backgroundTertiary : p.theme.colors.backgroundSecondary};
    border-right: 1px solid ${p => p.theme.colors.border};
    border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const DayNumber = styled.div`
    grid-row: 1;
    justify-self: start;
    align-self: start;
    margin: 4px 4px 1px;
    min-width: 1.6em;
    padding: 1px 5px;
    border-radius: ${p => p.theme.radii.full};
    font-weight: 700;
    font-size: .9rem;
    text-align: center;
    background: ${p => p.$today ? p.theme.colors.primary : 'transparent'};
    color: ${p => p.$today ? '#fff' : 'inherit'};
    @media (max-width: ${p => p.theme.breakpoints.sm}) { font-size: .75rem; margin: 2px 2px 1px; }
`;

const barBase = css`
    display: block;
    min-width: 0;
    height: ${LANE_HEIGHT}px;
    line-height: ${LANE_HEIGHT}px;
    font-size: .78rem;
    padding: 0 6px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-decoration: none;
    /* Square edges where the bar continues into the previous / next week. */
    margin-left: ${p => p.$openStart ? 0 : '3px'};
    margin-right: ${p => p.$openEnd ? 0 : '3px'};
    border-radius: ${p => {
        const l = p.$openStart ? 0 : 7;
        const r = p.$openEnd ? 0 : 7;
        return `${l}px ${r}px ${r}px ${l}px`;
    }};
    &:hover { filter: brightness(1.12); }
    @media (max-width: ${p => p.theme.breakpoints.sm}) { font-size: .65rem; padding: 0 3px; }
`;

const outlined = css`
    background: transparent;
    color: ${p => p.$color};
    border: 1px solid ${p => p.$color};
    ${p => p.$openStart && 'border-left: none;'}
    ${p => p.$openEnd && 'border-right: none;'}
    line-height: ${LANE_HEIGHT - 2}px;
`;

const TripBar = styled(Link)`
    ${barBase}
    background: ${p => p.$color};
    color: #fff;
    font-weight: 600;
`;

const NodeBar = styled(Link)`
    ${barBase}
    background: ${p => p.$color};
    color: #0f172a;
`;

const StopBar = styled(Link)`
    ${barBase}
    ${outlined}
`;

const AdventureBar = styled(Link)`
    ${barBase}
    ${outlined}
`;

const DayPhoto = styled(Link)`
    align-self: end;
    position: relative;
    display: block;
    height: 64px;
    margin: 2px 4px 4px;
    border-radius: ${p => p.theme.radii.md};
    overflow: hidden;
    background: ${p => p.theme.colors.backgroundTertiary};
    img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform ${p => p.theme.transitions.fast};
    }
    &:hover img { transform: scale(1.06); }
    @media (max-width: ${p => p.theme.breakpoints.sm}) { height: 38px; margin: 2px; }
`;

const PhotoCount = styled.span`
    position: absolute;
    right: 3px;
    bottom: 3px;
    padding: 0 4px;
    border-radius: ${p => p.theme.radii.base};
    background: rgba(15, 23, 42, .7);
    color: #fff;
    font-size: .65rem;
    line-height: 14px;
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function photoOwnerLink(p) {
    return p.trip_id ? `/trip/${p.trip_id}` : `/adventures/view?adventureID=${p.adventure_id}`;
}

function renderBar(item, days) {
    // Bars are clipped to the week; an edge is "open" when the item carries on past it.
    const openStart = !sameDay(days[item.c0], item.range.start);
    const openEnd = !sameDay(days[item.c1], item.range.end);
    const props = {
        key: item.key,
        style: { gridColumn: `${item.c0 + 1} / ${item.c1 + 2}`, gridRow: item.lane + 2 },
        $openStart: openStart,
        $openEnd: openEnd,
    };
    const tripColor = item.trip ? hashColor(item.trip.id) : null;
    switch (item.kind) {
        case 'trip':
            return (
                <TripBar {...props} to={`/trip/${item.trip.id}`} $color={tripColor}
                    title={`${item.trip.name} (${fmtRange(item.range)})`}>
                    {item.trip.name}
                </TripBar>
            );
        case 'node':
            return (
                <NodeBar {...props} to={`/trip/${item.trip.id}`} $color={fadedColor(tripColor)}
                    title={`${item.node.name} (${fmtRange(item.range)})`}>
                    {item.node.name}
                </NodeBar>
            );
        case 'stop': {
            const label = `${getStopEmoji(item.stop.category)} ${item.stop.name}`;
            return (
                <StopBar {...props} to={`/trip/${item.trip.id}`} $color={tripColor}
                    title={`${label} (${fmtRange(item.range)})`}>
                    {label}
                </StopBar>
            );
        }
        case 'adventure':
            return (
                <AdventureBar {...props} to={`/adventures/view?adventureID=${item.adventure.id}`} $color={ADVENTURE_COLOR}
                    title={`${item.adventure.name} (${fmtRange(item.range)})`}>
                    {item.adventure.name}
                </AdventureBar>
            );
        default:
            return null;
    }
}

function Calendar() {
    useDocumentTitle("Calendar");
    const today = useMemo(localToday, []);
    const [year, setYear] = useState(today.getUTCFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getUTCMonth());
    const [view, setView] = useState('year');
    const [trips, setTrips] = useState([]);
    const [adventures, setAdventures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tripDetails, setTripDetails] = useState({});
    const [pendingDetails, setPendingDetails] = useState(0);
    const [photosByMonth, setPhotosByMonth] = useState({});
    const requestedDetails = useRef(new Set());
    const requestedPhotos = useRef(new Set());

    // Trips and adventures overlapping the selected year, with parsed date ranges.
    useEffect(() => {
        let cancelled = false;
        const yearStart = new Date(Date.UTC(year, 0, 1));
        const yearEnd = new Date(Date.UTC(year, 11, 31));
        const inYear = rows => rows
            .filter(r => overlaps(r.range, yearStart, yearEnd))
            .sort((a, b) => (a.range.start - b.range.start) || (a.id - b.id));
        setLoading(true);
        Promise.all([
            listTrips(),
            listAdventures().catch(err => { console.warn('Failed loading adventures', err); return []; }),
        ])
            .then(([tripRows, advRows]) => {
                if (cancelled) return;
                setTrips(inYear(tripRows.map(t => ({ ...t, range: dayRange(t.start_date, t.end_date) }))));
                setAdventures(inYear(advRows.map(a => ({ ...a, range: dayRange(a.start_date, a.end_date) }))));
            })
            .catch(err => console.error('Failed loading trips', err))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [year]);

    const monthBounds = useMemo(() => ({
        start: new Date(Date.UTC(year, selectedMonth, 1)),
        end: new Date(Date.UTC(year, selectedMonth, daysInMonth(year, selectedMonth))),
    }), [year, selectedMonth]);

    const monthTrips = useMemo(
        () => trips.filter(t => overlaps(t.range, monthBounds.start, monthBounds.end)),
        [trips, monthBounds]
    );
    const monthAdventures = useMemo(
        () => adventures.filter(a => overlaps(a.range, monthBounds.start, monthBounds.end)),
        [adventures, monthBounds]
    );

    // Nodes and stops for trips in the shown month, each trip fetched once.
    useEffect(() => {
        if (view !== 'month') return;
        const todo = monthTrips.filter(t => !requestedDetails.current.has(t.id));
        if (!todo.length) return;
        todo.forEach(t => requestedDetails.current.add(t.id));
        setPendingDetails(n => n + todo.length);
        todo.forEach(t => {
            Promise.all([
                listNodesByTrip(t.id).catch(() => []),
                listStopsByTrip(t.id).catch(() => []),
            ])
                .then(([nodes, stops]) => setTripDetails(prev => ({ ...prev, [t.id]: buildTripStructure(nodes, stops) })))
                .catch(err => console.warn('Failed loading trip details', t.id, err))
                .finally(() => setPendingDetails(n => n - 1));
        });
    }, [view, monthTrips]);

    // One random photo per day for the shown month, fetched once per month.
    useEffect(() => {
        if (view !== 'month') return;
        const key = `${year}-${selectedMonth}`;
        if (requestedPhotos.current.has(key)) return;
        requestedPhotos.current.add(key);
        listCalendarPhotos(dateKey(monthBounds.start), dateKey(monthBounds.end))
            .then(rows => setPhotosByMonth(prev => ({ ...prev, [key]: Object.fromEntries(rows.map(r => [r.date, r])) })))
            .catch(err => {
                console.warn('Failed loading calendar photos', err);
                requestedPhotos.current.delete(key);
            });
    }, [view, year, selectedMonth, monthBounds]);

    const weekLayouts = useMemo(() => {
        if (view !== 'month') return [];
        return buildWeeks(year, selectedMonth).map(days => ({
            days,
            ...layoutWeek(days, monthTrips, monthAdventures, tripDetails),
        }));
    }, [view, year, selectedMonth, monthTrips, monthAdventures, tripDetails]);

    const shiftMonth = delta => {
        const idx = year * 12 + selectedMonth + delta;
        setYear(Math.floor(idx / 12));
        setSelectedMonth(((idx % 12) + 12) % 12);
    };

    function renderYearView() {
        return (
            <div>
                <Controls>
                    <Button variant="outline" size="sm" onClick={() => setYear(y => y - 1)}>← {year - 1}</Button>
                    <Title>{year}</Title>
                    <Button variant="outline" size="sm" onClick={() => setYear(y => y + 1)}>{year + 1} →</Button>
                </Controls>
                {loading && <Muted>Loading trips…</Muted>}
                <YearGrid>
                    {MONTH_NAMES.map((mName, idx) => {
                        const total = daysInMonth(year, idx);
                        const monthStart = new Date(Date.UTC(year, idx, 1));
                        const monthEnd = new Date(Date.UTC(year, idx, total));
                        const dayTrips = Array.from({ length: total }, () => []);
                        const dayAdventures = Array.from({ length: total }, () => []);
                        const mark = (rows, perDay) => rows.forEach(r => {
                            const c = intersect(r.range, { start: monthStart, end: monthEnd });
                            if (!c) return;
                            for (let d = c.start.getUTCDate(); d <= c.end.getUTCDate(); d++) perDay[d - 1].push(r);
                        });
                        mark(trips, dayTrips);
                        mark(adventures, dayAdventures);

                        const lead = monthStart.getUTCDay();
                        const cells = [];
                        for (let i = 0; i < lead; i++) cells.push(null);
                        for (let d = 1; d <= total; d++) cells.push(d);
                        while (cells.length < 42) cells.push(null);

                        return (
                            <MonthCard key={mName} onClick={() => { setSelectedMonth(idx); setView('month'); }}>
                                <MonthTitle>{mName}</MonthTitle>
                                <MiniMonthGrid>
                                    {WEEKDAY_INITIALS.map((h, hi) => <MiniDay key={`h-${hi}`} $header>{h}</MiniDay>)}
                                    {cells.map((d, i) => {
                                        if (d === null) return <MiniDay key={i} $blank />;
                                        const tripsForDay = dayTrips[d - 1];
                                        const advForDay = dayAdventures[d - 1];
                                        const style = {};
                                        if (tripsForDay.length === 1) {
                                            style.background = hashColor(tripsForDay[0].id);
                                            style.color = '#fff';
                                            style.opacity = .9;
                                        } else if (tripsForDay.length > 1) {
                                            const cols = tripsForDay.slice(0, 3).map(t => hashColor(t.id));
                                            const seg = 100 / cols.length;
                                            style.background = `linear-gradient(90deg, ${cols.map((col, ci) => `${col} ${ci * seg}% ${(ci + 1) * seg}%`).join(',')})`;
                                            style.color = '#fff';
                                            style.opacity = .95;
                                        } else if (advForDay.length > 0) {
                                            style.boxShadow = `inset 0 0 0 2px ${ADVENTURE_COLOR}`;
                                            style.borderRadius = 4;
                                        }
                                        // Dots: each trip when several share the day; adventures when they'd
                                        // otherwise be hidden (trip day) or several share the day.
                                        const dots = [
                                            ...(tripsForDay.length > 1 ? tripsForDay.map(t => ({ key: `t-${t.id}`, color: hashColor(t.id) })) : []),
                                            ...((tripsForDay.length > 0 || advForDay.length > 1) ? advForDay.map(a => ({ key: `a-${a.id}`, color: ADVENTURE_COLOR })) : []),
                                        ].slice(0, 4);
                                        const isToday = sameDay(today, new Date(Date.UTC(year, idx, d)));
                                        return (
                                            <MiniDay key={i} $today={isToday} style={style}>
                                                {d}
                                                {dots.length > 0 && (
                                                    <MiniDayDots>
                                                        {dots.map(dot => <Dot key={dot.key} $color={dot.color} />)}
                                                    </MiniDayDots>
                                                )}
                                            </MiniDay>
                                        );
                                    })}
                                </MiniMonthGrid>
                            </MonthCard>
                        );
                    })}
                </YearGrid>
            </div>
        );
    }

    function renderMonthView() {
        const photos = photosByMonth[`${year}-${selectedMonth}`] || {};
        return (
            <MonthShell>
                <MonthHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem' }}>
                        <Button variant="outline" size="sm" onClick={() => setView('year')}>← Year</Button>
                        <Title style={{ margin: 0 }}>{MONTH_NAMES[selectedMonth]} {year}</Title>
                    </div>
                    <div style={{ display: 'flex', gap: '.6rem' }}>
                        <Button variant="outline" size="sm" onClick={() => shiftMonth(-1)}>Prev</Button>
                        <Button variant="outline" size="sm" onClick={() => shiftMonth(1)}>Next</Button>
                    </div>
                </MonthHeader>
                {(loading || pendingDetails > 0) && <Muted>Loading trip details…</Muted>}
                <WeekdayHeader>
                    {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
                </WeekdayHeader>
                <Weeks>
                    {weekLayouts.map(({ days, items, laneCount }) => (
                        <WeekRow key={dateKey(days.find(Boolean))} $lanes={laneCount}>
                            {days.map((d, c) => (
                                <DayBackground key={`bg-${c}`} style={{ gridColumn: c + 1 }}
                                    $blank={!d} $today={sameDay(d, today)} />
                            ))}
                            {days.map((d, c) => d && (
                                <DayNumber key={`n-${c}`} style={{ gridColumn: c + 1 }} $today={sameDay(d, today)}>
                                    {d.getUTCDate()}
                                </DayNumber>
                            ))}
                            {items.map(item => renderBar(item, days))}
                            {days.map((d, c) => {
                                const photo = d && photos[dateKey(d)];
                                if (!photo) return null;
                                const owner = photo.trip_name || photo.adventure_name || '';
                                const label = [photo.description, owner].filter(Boolean).join(' · ');
                                return (
                                    <DayPhoto key={`p-${c}`} to={photoOwnerLink(photo)}
                                        style={{ gridColumn: c + 1, gridRow: laneCount + 2 }}
                                        title={photo.day_count > 1 ? `${label} (${photo.day_count} photos this day)` : label}>
                                        <img
                                            src={photo.thumbnail_url.startsWith('http') ? photo.thumbnail_url : `${API_ORIGIN}${photo.thumbnail_url}`}
                                            alt={label || `Photo from ${dateKey(d)}`}
                                            onError={e => { e.currentTarget.parentElement.style.display = 'none'; }}
                                        />
                                        {photo.day_count > 1 && <PhotoCount>+{photo.day_count - 1}</PhotoCount>}
                                    </DayPhoto>
                                );
                            })}
                        </WeekRow>
                    ))}
                </Weeks>
            </MonthShell>
        );
    }

    return (
        <Page>
            {view === 'year' ? renderYearView() : renderMonthView()}
        </Page>
    );
}

export default Calendar;
