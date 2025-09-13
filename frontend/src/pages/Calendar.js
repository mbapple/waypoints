import React, { useEffect, useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { listTrips } from '../api/trips';
import { listNodesByTrip } from '../api/nodes';
import { listStopsByTrip } from '../api/stops';

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
    font-size: .7rem;
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

const Pill = styled(Link)`
    display: inline-block;
    background: ${p => p.color};
    color: #fff;
    padding: 3px 6px 2px;
    border-radius: 6px;
    font-size: .7rem;
    margin: 2px 3px 2px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-decoration: none;
    box-shadow: 0 0 0 1px rgba(255,255,255,.15);
`;

const Legend = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    margin-top: 1rem;
    font-size: .75rem;
`;

const LegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const ColorSwatch = styled.span`
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background: ${p => p.color};
    display: inline-block;
`;

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
function buildTripDayData(nodes=[],stops=[]) {
    const by = {};
    nodes.forEach(n => { if (n.arrival_date) { (by[n.arrival_date] ||= {nodes:[],stops:[]}).nodes.push(n); } });
    stops.forEach(s => { if (s.date) { (by[s.date] ||= {nodes:[],stops:[]}).stops.push(s); } });
    return by;
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
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    }, [year]);

    useEffect(() => { fetchTrips(); }, [fetchTrips]);

    const monthTrips = useMemo(() => {
        const ms = new Date(Date.UTC(year, selectedMonth, 1));
        const me = new Date(Date.UTC(year, selectedMonth, daysInMonth(year, selectedMonth)));
        return trips.filter(t => {
            const s = parseISO(t.start_date); const e = parseISO(t.end_date);
            if (!s || !e) return false;
            return e >= ms && s <= me;
        });
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
                    setTripDetails(prev => ({
                        ...prev,
                        [t.id]: { nodes, stops, dayData: buildTripDayData(nodes, stops) }
                    }));
                } catch (err) {
                    console.warn('Failed loading trip details', t.id, err);
                }
            }));
        } finally { setLoadingMonthDetails(false); }
    }, [monthTrips, tripDetails]);

    useEffect(() => { if (view === 'month') loadDetailsForMonth(); }, [view, selectedMonth, loadDetailsForMonth]);

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
                                    {['S','M','T','W','T','F','S'].map(h => <MiniDay key={h} isHeader>{h}</MiniDay>)}
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
                        const detailPills = [];
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
                                    if (details && details.dayData[iso]) {
                                        details.dayData[iso].nodes.forEach((n,idx) => detailPills.push(
                                            <Pill key={`n-${t.id}-${idx}`} to={`/trip/${t.id}`} color={hashColor(t.id)} title={`${t.name} – node: ${n.name}`}>{n.name}</Pill>
                                        ));
                                        details.dayData[iso].stops.forEach((s2,idx) => detailPills.push(
                                            <Pill key={`s-${t.id}-${idx}`} to={`/trip/${t.id}`} color={hashColor(t.id)} title={`${t.name} – stop: ${s2.name}`}>{s2.name}</Pill>
                                        ));
                                    }
                                }
                            });
                        }
                        return (
                            <DayCell key={key} isToday={c.date && isSameDay(c.date, today)}>
                                <DayNumber dim={c.dim}>{c.label}</DayNumber>
                                <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                                    {tripBars}
                                    {detailPills}
                                </div>
                            </DayCell>
                        );
                    })}
                </CalendarGrid>
                <Legend>
                    {monthTrips.map(t => (
                        <LegendItem key={t.id}>
                            <ColorSwatch color={hashColor(t.id)} />
                            <Link style={{color:'inherit',textDecoration:'none'}} to={`/trip/${t.id}`}>{t.name}</Link>
                        </LegendItem>
                    ))}
                </Legend>
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