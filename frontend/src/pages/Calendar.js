import React, { useEffect, useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { listTrips } from '../api/trips';
import { listNodesByTrip } from '../api/nodes';
import { listStopsByTrip } from '../api/stops';
import { getStopEmoji } from '../styles/mapTheme';

// ---------------------------------------------------------------------------
// Styled Components (expanded + larger font sizes)
// ---------------------------------------------------------------------------

const Container = styled.div`
    margin-top: 1.5rem;
`;

const YearGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
    align-items: start;
`;

const MonthCard = styled.div`
    background: ${p => p.theme.colors.card};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    padding: 0.65rem 0.75rem 0.9rem;
    cursor: pointer;
    position: relative;
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

// Mini month grid (year view)
const MiniMonthGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0;
    margin-top: .25rem;
`;

const MiniDay = styled.div`
    min-height: 22px;
    font-size: .70rem;
    line-height: 1;
    font-weight: ${p => p.isHeader ? 600 : 500};
    text-align: center;
    padding: 3px 0 2px;
    position: relative;
    background: ${p => p.isHeader ? 'transparent' : p.theme.colors.backgroundSecondary};
    opacity: ${p => p.dim ? 0.35 : 1};
    border: 0;
    cursor: ${p => p.clickable ? 'pointer' : 'default'};
    user-select: none;
`;

const MiniDayTrips = styled.div`
    position: absolute;
    left: 2px;
    right: 2px;
    bottom: 2px;
    display: flex;
    gap: 2px;
    justify-content: center;
    flex-wrap: wrap;
`;

const TripDot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${p => p.color};
    box-shadow: 0 0 0 1px rgba(255,255,255,.4);
`;

const Controls = styled.div`
    display: flex;
    gap: .9rem;
    align-items: center;
    margin-bottom: 1.4rem;
    flex-wrap: wrap;
`;

const Button = styled.button`
    background: ${p => p.variant === 'primary' ? p.theme.colors.primary : 'transparent'};
    color: ${p => p.variant === 'primary' ? '#fff' : p.theme.colors.text};
    border: 1px solid ${p => p.variant === 'primary' ? p.theme.colors.primary : p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    padding: .55rem .95rem;
    font-size: .9rem;
    cursor: pointer;
    transition: ${p => p.theme.transitions.fast};
    &:hover { background: ${p => p.variant === 'primary' ? p.theme.colors.primaryHover : p.theme.colors.surfaceHover}; }
`;

const MonthHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: .85rem;
`;

// Main (detailed view) calendar grid
const CalendarGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0;
`;

const DayCell = styled.div`
    min-height: 120px;
    background: ${p => p.isToday ? p.theme.colors.backgroundTertiary : p.theme.colors.backgroundSecondary};
    border: 0;
    padding: 6px 0 8px;
    display: flex;
    flex-direction: column;
    font-size: .75rem;
    overflow: hidden;
`;

const DayNumber = styled.div`
    font-weight: 700;
    font-size: .9rem;
    margin-bottom: 4px;
    padding-left: 4px;
    opacity: ${p => p.dim ? 0.28 : 0.95};
`;

const DayTripBar = styled(Link)`
    display: block;
    height: 18px;
    line-height: 18px;
    font-size: .8rem;
    background: ${p => p.color};
    color: #fff;
    text-decoration: none;
    margin-bottom: 3px;
    border-radius: ${p => p.radius};
    padding: 0 6px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    box-shadow: 0 0 0 1px rgba(255,255,255,.15);
`;

// Bar for nodes spanning multiple days
const NodeBar = styled(Link)`
    display: block;
    height: 18px;
    line-height: 18px;
    font-size: .8rem;
    background: ${p => p.color}; /* already faded */
    color: #fff;
    text-decoration: none;
    margin-bottom: 2px;
    border-radius: ${p => p.radius};
    padding: 0 4px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
`;

// Bar for multi-day stops (hotel first)
const StopBar = styled(Link)`
    display: block;
    height: 18px;
    line-height: 18px;
    font-size: .8rem;
    background: transparent;
    border: 1px solid ${p => p.color};
    border-left: ${p => p.hideLeftBorder ? 'none' : `1px solid ${p.color}`};
    border-right: ${p => p.hideRightBorder ? 'none' : `1px solid ${p.color}`};
    color: ${p => p.color};
    text-decoration: none;
    margin-bottom: 2px;
    border-radius: ${p => p.radius};
    padding: 0 3px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
`;


// Legend components removed (calendar legend currently disabled). Re-add if legend UI returns.

// Month shell (detailed view wrapper)
const MonthCalendarShell = styled.div`
    background: ${p => p.theme.colors.card};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 1.1rem 1.2rem 1.4rem;
    box-shadow: ${p => p.theme.shadows.md};
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

function parseISO(str) {
    if (!str) return null;
    const [y,m,d] = str.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m-1, d));
}
function dateKey(d){ return d.toISOString().slice(0,10); }
function daysInMonth(y,m){ return new Date(Date.UTC(y, m+1, 0)).getUTCDate(); }
function isSameDay(a,b){ return a&&b&&a.getUTCFullYear()===b.getUTCFullYear()&&a.getUTCMonth()===b.getUTCMonth()&&a.getUTCDate()===b.getUTCDate(); }
function hashColor(id){ const h=(id*57)%360; return `hsl(${h} 65% 45%)`; }
// (Removed old buildTripDayData logic; monthly view now uses precomputed layout only)

// Helper to fade trip color (convert hsl to hsla with alpha)
// Lighten + desaturate trip color for node fill (solid, not transparent)
function fadedColor(c){
    if (!c) return c;
    const m = c.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
    if (m) {
        const h = Number(m[1]);
        const s = Math.max(20, Math.min(100, Number(m[2]) - 15));
        const l = Math.max(15, Math.min(92, Number(m[3]) + 18));
        return `hsl(${h} ${s}% ${l}%)`;
    }
    return c;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Calendar() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('year');
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [tripDetails, setTripDetails] = useState({});
    const [loadingMonthDetails, setLoadingMonthDetails] = useState(false);

    const fetchTrips = useCallback(async () => {
        try {
            setLoading(true);
            const res = await listTrips();
            const yearStart = new Date(Date.UTC(year,0,1));
            const yearEnd   = new Date(Date.UTC(year,11,31));
            setTrips(res.filter(t => {
                const s = parseISO(t.start_date); const e = parseISO(t.end_date);
                if (!s || !e) return false;
                return e >= yearStart && s <= yearEnd;
            }));
            // Minimal debug: comment out if not needed
            // console.log('[Calendar][fetchTrips] Raw trips response:', res);
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    }, [year]);

    useEffect(() => { fetchTrips(); }, [fetchTrips]);

    const monthTrips = useMemo(() => {
        const ms = new Date(Date.UTC(year, selectedMonth, 1));
        const me = new Date(Date.UTC(year, selectedMonth, daysInMonth(year, selectedMonth)));
    const filtered = trips.filter(t => {
            const s = parseISO(t.start_date); const e = parseISO(t.end_date);
            if (!s || !e) return false;
            return e >= ms && s <= me;
        });
    // console.log('[Calendar][monthTrips] Computed monthTrips for month', selectedMonth, 'year', year, filtered);
    return filtered;
    }, [trips, year, selectedMonth]);

    const loadDetailsForMonth = useCallback(async () => {
        setLoadingMonthDetails(true);
        try {
            await Promise.all(monthTrips.map(async t => {
                if (tripDetails[t.id]) return; // already loaded
                try {
                    const [nodes, stops] = await Promise.all([
                        listNodesByTrip(t.id).catch(()=>[]),
                        listStopsByTrip(t.id).catch(()=>[])
                    ]);
                    // Precompute month layout data used for per-day dynamic packing.
                    // 1. Visible nodes only.
                    const visibleNodes = nodes.filter(n => !n.invisible);
                    // 2. Sort like TripDetailsDaily / TripDetailsList logic:
                    //    Sort by primary chronological date (departure OR arrival); when same date, departure-only first.
                    const sortedNodes = [...visibleNodes].sort((a,b) => {
                        const aDate = new Date(a.departure_date || a.arrival_date || '1900-01-01');
                        const bDate = new Date(b.departure_date || b.arrival_date || '1900-01-01');
                        if (aDate.getTime() === bDate.getTime()) {
                            const aIsDepartureOnly = !a.arrival_date && a.departure_date;
                            const bIsDepartureOnly = !b.arrival_date && b.departure_date;
                            if (aIsDepartureOnly && !bIsDepartureOnly) return -1;
                            if (!aIsDepartureOnly && bIsDepartureOnly) return 1;
                        }
                        return aDate - bDate;
                    });
                    // 3. Build lightweight structures (we will pack rows daily, not reserve fixed rows for whole month).
                    const layoutNodes = sortedNodes.map(n => {
                        const spanStart = n.arrival_date || n.departure_date; // earliest known
                        const spanEnd = (n.arrival_date && n.departure_date && n.departure_date >= n.arrival_date) ? n.departure_date : spanStart;
                        const nodeStops = stops.filter(s => s.node_id === n.id);
                        const multiHotel = nodeStops.filter(s => (s.category||'').toLowerCase()==='hotel' && s.start_date && s.end_date && s.end_date !== s.start_date)
                            .sort((a,b)=> new Date(a.start_date)-new Date(b.start_date));
                        const multiOther = nodeStops.filter(s => (s.category||'').toLowerCase()!=='hotel' && s.start_date && s.end_date && s.end_date !== s.start_date)
                            .sort((a,b)=> new Date(a.start_date)-new Date(b.start_date));
                        const multiSpans = [
                            ...multiHotel.map(s => ({ kind:'stopSpan', priority:1, stop:s })),
                            ...multiOther.map(s => ({ kind:'stopSpan', priority:2, stop:s }))
                        ];
                        const singles = nodeStops.filter(s => !(s.start_date && s.end_date && s.end_date !== s.start_date));
                        return { node:n, spanStart, spanEnd, multiSpans, singles };
                    });
                    setTripDetails(prev => ({
                        ...prev,
                        [t.id]: { nodes, stops, monthLayout: { layoutNodes } }
                    }));
                    // console.log(`[Calendar][loadDetailsForMonth] Trip ${t.id} details loaded`, { nodesCount: nodes.length, stopsCount: stops.length });
                } catch (err) {
                    console.warn('Failed loading trip details', t.id, err);
                }
            }));
        } finally { setLoadingMonthDetails(false); }
    }, [monthTrips, tripDetails]);

    useEffect(() => { if (view === 'month') loadDetailsForMonth(); }, [view, selectedMonth, loadDetailsForMonth]);

    // (Verbose debug logging removed)

    function renderYearView() {
        return (
            <div>
                <Controls>
                    <Button onClick={() => setYear(y => y - 1)}>← {year - 1}</Button>
                    <h1 style={{ margin: '0 .5rem', fontSize: '1.75rem' }}>{year}</h1>
                    <Button onClick={() => setYear(y => y + 1)}>{year + 1} →</Button>
                </Controls>
                {loading && <p style={{ opacity: .6 }}>Loading trips…</p>}
                <YearGrid>
                    {monthNames.map((mName, idx) => {
                        const totalDays = daysInMonth(year, idx);
                        const first = new Date(Date.UTC(year, idx, 1));
                        const startWeekday = first.getUTCDay();
                        const monthStart = new Date(Date.UTC(year, idx, 1));
                        const monthEnd = new Date(Date.UTC(year, idx, totalDays));
                        const dayTrips = Array.from({ length: totalDays }, () => []);
                        trips.forEach(t => {
                            const s = parseISO(t.start_date); const e = parseISO(t.end_date); if(!s||!e) return;
                            if (e < monthStart || s > monthEnd) return;
                            const cs = s < monthStart ? monthStart : s;
                            const ce = e > monthEnd ? monthEnd : e;
                            for (let d = cs; d <= ce; d = new Date(d.getTime()+86400000)) {
                                const di = Math.floor((d - monthStart)/86400000);
                                if (di >= 0 && di < totalDays) dayTrips[di].push(t);
                            }
                        });
                        const cells = [];
                        for (let i=0;i<startWeekday;i++) cells.push({ label:'', dim:true, dayIndex:-1 });
                        for (let d=1; d<=totalDays; d++) cells.push({ label:String(d), dim:false, dayIndex:d-1 });
                        while (cells.length < 42) cells.push({ label:'', dim:true, dayIndex:-1 });
                        return (
                            <MonthCard key={mName} onClick={() => { setSelectedMonth(idx); setView('month'); }}>
                                <MonthTitle>{mName}</MonthTitle>
                                <MiniMonthGrid>
                                    {['S','M','T','W','T','F','S'].map((h, hi) => <MiniDay key={`${h}-${hi}`} isHeader>{h}</MiniDay>)}
                                    {cells.map((c, i) => {
                                        const tripsForDay = c.dayIndex>=0 ? dayTrips[c.dayIndex] : [];
                                        const style = {};
                                        if (!c.dim && tripsForDay.length === 1) {
                                            style.background = hashColor(tripsForDay[0].id);
                                            style.color = '#fff';
                                            style.opacity = .9;
                                        } else if (!c.dim && tripsForDay.length > 1) {
                                            const cols = tripsForDay.slice(0,3).map(t=>hashColor(t.id));
                                            const seg = 100 / cols.length;
                                            style.background = `linear-gradient(90deg, ${cols.map((col,i)=>`${col} ${(i*seg)}% ${(i+1)*seg}%`).join(',')})`;
                                            style.color = '#fff';
                                            style.opacity = .95;
                                        }
                                        return (
                                            <MiniDay key={i} dim={c.dim} clickable={!c.dim} style={style}>
                                                {c.label}
                                                {!c.dim && tripsForDay.length > 1 && (
                                                    <MiniDayTrips>
                                                        {tripsForDay.slice(0,4).map(t => <TripDot key={t.id} color={hashColor(t.id)} />)}
                                                    </MiniDayTrips>
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

    function buildMonthCells() {
        const total = daysInMonth(year, selectedMonth);
        const first = new Date(Date.UTC(year, selectedMonth, 1));
        const startW = first.getUTCDay();
        const cells = [];
        for (let i=0;i<startW;i++) cells.push({date:null,label:'',dim:true});
        for (let d=1; d<=total; d++) cells.push({date:new Date(Date.UTC(year,selectedMonth,d)),label:d,dim:false});
        return cells;
    }

    function renderMonthView() {
        const cells = buildMonthCells();
    // Per-trip persistent row state across sequential day iteration
    const tripRowState = {}; // t.id -> { assignments: { key: row }, lastDay: null }
        return (
            <MonthCalendarShell>
                <MonthHeader>
                    <div style={{ display:'flex', alignItems:'center', gap:'.9rem' }}>
                        <Button onClick={() => setView('year')}>← Year</Button>
                        <h1 style={{ margin:0, fontSize:'1.9rem' }}>{monthNames[selectedMonth]} {year}</h1>
                    </div>
                    <div style={{ display:'flex', gap:'.6rem' }}>
                        <Button onClick={() => { setSelectedMonth(m => (m+11)%12); if(selectedMonth===0) setYear(y=>y-1); }}>Prev</Button>
                        <Button onClick={() => { setSelectedMonth(m => (m+1)%12); if(selectedMonth===11) setYear(y=>y+1); }}>Next</Button>
                    </div>
                </MonthHeader>
                {loadingMonthDetails && <p style={{ opacity:.6 }}>Loading trip details…</p>}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:0,fontSize:'.85rem',fontWeight:700,opacity:.75,textAlign:'center',padding:'0 0 6px'}}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <CalendarGrid>
                    {cells.map((c,i) => {
                        const key = c.date ? dateKey(c.date) : `x-${i}`;
                        const tripBars = [];
                        // detailPills removed in refactor
                        if (c.date) {
                            const iso = key;
                            monthTrips.forEach(t => {
                                const s = parseISO(t.start_date); const e = parseISO(t.end_date); if(!s||!e) return;
                                if (c.date >= s && c.date <= e) {
                                    const isStart = isSameDay(c.date, s);
                                    const isEnd = isSameDay(c.date, e);
                                    let radius = '0';
                                    if (isStart && isEnd) radius = '9px';
                                    else if (isStart) radius = '9px 0 0 9px';
                                    else if (isEnd) radius = '0 9px 9px 0';
                                    const label = isStart ? t.name : '';
                                    tripBars.push(
                                        <DayTripBar
                                            key={`bar-${t.id}`}
                                            to={`/trip/${t.id}`}
                                            color={hashColor(t.id)}
                                            radius={radius}
                                            title={`${t.name} (${t.start_date} → ${t.end_date})`}
                                        >{label}</DayTripBar>
                                    );
                                    const details = tripDetails[t.id];
                                    if (details && details.monthLayout) {
                                        const tripColor = hashColor(t.id);
                                        // Persistent row assignments across days for continuity.
                                        if (!tripRowState[t.id]) tripRowState[t.id] = { assignments: {} };
                                        const state = tripRowState[t.id];
                                        const activeSpanKeys = [];
                                        const spanInfos = []; // { key, start, end, make }
                                        // Build ordered spans (node then its multi-day stops)
                                        details.monthLayout.layoutNodes.forEach(ln => {
                                            const nStart = parseISO(ln.spanStart); const nEnd = parseISO(ln.spanEnd);
                                            const nActive = nStart && nEnd && c.date >= nStart && c.date <= nEnd;
                                            if (nActive) {
                                                const isStartN = isSameDay(c.date, nStart);
                                                const isEndN = isSameDay(c.date, nEnd);
                                                const isSingleDay = ln.spanStart === ln.spanEnd;
                                                let radiusN='0'; 
                                                if (isSingleDay || (isStartN && isEndN)) radiusN='7px'; 
                                                else if (isStartN) radiusN='7px 0 0 7px'; 
                                                else if (isEndN) radiusN='0 7px 7px 0';
                                                const nodeKey = `node-${ln.node.id}`;
                                                activeSpanKeys.push(nodeKey);
                                                spanInfos.push({ key: nodeKey, start:nStart, end:nEnd, make: () => (
                                                    <NodeBar key={`${nodeKey}-${iso}`} to={`/trip/${t.id}`} color={fadedColor(tripColor)} radius={radiusN} title={ln.node.name}>{isStartN ? ln.node.name : ''}</NodeBar>
                        ) });
                                                ln.multiSpans.forEach(ms => {
                                                    const s = ms.stop; const sStart = parseISO(s.start_date); const sEnd = parseISO(s.end_date); if(!sStart||!sEnd) return;
                                                    const sActive = c.date >= sStart && c.date <= sEnd;
                                                    if (sActive) {
                                                        const isStartS = isSameDay(c.date, sStart);
                                                        const isEndS = isSameDay(c.date, sEnd);
                                                        const isSingleDayStop = s.start_date === s.end_date;
                                                        let r='0'; 
                                                        if (isSingleDayStop || (isStartS && isEndS)) r='7px'; 
                                                        else if (isStartS) r='7px 0 0 7px'; 
                                                        else if (isEndS) r='0 7px 7px 0';
                                                        // For middle days, r stays '0' which creates seamless connection
                                                        const stopKey = `stopspan-${s.id}`;
                                                        activeSpanKeys.push(stopKey);
                            spanInfos.push({ key: stopKey, parentNodeKey: nodeKey, start:sStart, end:sEnd, make: () => (
                                                            <StopBar 
                                                                key={`${stopKey}-${iso}`} 
                                                                to={`/trip/${t.id}`} 
                                                                color={tripColor} 
                                                                radius={r} 
                                                                title={s.name}
                                                                hideLeftBorder={!isStartS && !isSingleDayStop}
                                                                hideRightBorder={!isEndS && !isSingleDayStop}
                                                            >
                                                                {isStartS ? `${getStopEmoji(s.category)} ${s.name}` : ''}
                                                            </StopBar>
                                                        ) });
                                                    }
                                                });
                                            }
                                        });
                                        // Remove ended spans from assignments
                                        Object.keys(state.assignments).forEach(spanKey => {
                                            if (!activeSpanKeys.includes(spanKey)) delete state.assignments[spanKey];
                                        });
                                        // Assign rows preserving existing rows; gather used set
                                        const used = new Set(Object.values(state.assignments));
                                        spanInfos.forEach(si => {
                                            if (state.assignments[si.key] === undefined) {
                                                // Minimum row constraint: stop spans must be below their node row
                                                const minRow = si.parentNodeKey !== undefined && state.assignments[si.parentNodeKey] !== undefined
                                                    ? state.assignments[si.parentNodeKey] + 1
                                                    : 0;
                                                let r = minRow;
                                                while (used.has(r)) r++;
                                                state.assignments[si.key] = r; used.add(r);
                                            }
                                        });
                                        // NO compaction - keep row assignments stable to prevent visual jumping
                                        // Render rows: group elements by row (in order of spanInfos added)
                                        const rowElems = new Map();
                                        spanInfos.forEach(si => {
                                            const r = state.assignments[si.key];
                                            if (!rowElems.has(r)) rowElems.set(r, []);
                                            rowElems.get(r).push(si.make());
                                        });
                                        
                                        // Fill gaps with invisible placeholders to maintain consistent positioning
                                        const maxAssignedRow = Math.max(...Object.values(state.assignments), -1);
                                        for (let r = 0; r <= maxAssignedRow; r++) {
                                            if (!rowElems.has(r)) {
                                                rowElems.set(r, [<div key={`placeholder-${t.id}-${r}-${iso}`} style={{height:18, marginBottom:2}} />]);
                                            }
                                        }
                                        
                                        // Single-day stops (ephemeral) placed after existing rows; they don't get continuity.
                                        let maxRowIndex = maxAssignedRow;
                                        details.monthLayout.layoutNodes.forEach(ln => {
                                            const singlesToday = ln.singles.filter(sg => {
                                                if (sg.start_date && sg.end_date && sg.end_date !== sg.start_date) return false;
                                                const d = sg.start_date || sg.end_date; return d === iso;
                                            });
                                            singlesToday.forEach(sg => {
                                                maxRowIndex += 1;
                                                rowElems.set(maxRowIndex, [
                                                    <StopBar key={`single-${t.id}-${sg.id}-${iso}`} to={`/trip/${t.id}`} color={tripColor} radius='7px' title={sg.name}>{getStopEmoji(sg.category)} {sg.name}</StopBar>
                                                ]);
                                            });
                                        });
                                        // Push to tripBars in row order
                                        [...rowElems.keys()].sort((a,b)=>a-b).forEach(ridx => {
                                            const elems = rowElems.get(ridx);
                                            if (elems.length === 1) tripBars.push(elems[0]);
                                            else tripBars.push(<div key={`rowwrap-${t.id}-${ridx}-${iso}`} style={{display:'flex', gap:4, height:18, marginBottom:3}}>{elems}</div>);
                                        });
                                    }
                                }
                            });
                        }
                        return (
                            <DayCell key={key} isToday={c.date && isSameDay(c.date, today)}>
                                <DayNumber dim={c.dim}>{c.label}</DayNumber>
                                <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                                    {tripBars}
                                </div>
                            </DayCell>
                        );
                    })}
                </CalendarGrid>
                {/* <Legend>
                    {monthTrips.map(t => (
                        <LegendItem key={t.id}>
                            <ColorSwatch color={hashColor(t.id)} />
                            <Link style={{color:'inherit',textDecoration:'none'}} to={`/trip/${t.id}`}>{t.name}</Link>
                        </LegendItem>
                    ))}
                </Legend> */}
            </MonthCalendarShell>
        );
    }

    return (
        <Container>
            {view === 'year' ? renderYearView() : renderMonthView()}
        </Container>
    );
}

export default Calendar;