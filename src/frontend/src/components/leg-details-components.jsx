// Components and helpers for leg-specific detail capture (Car, etc.)
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { Input, Label, FormGroup, Text, Button, Flex } from '../styles/components';
import { getIntegrationStatus, fetchDrivingRoute, fetchFlightTrack, lookupFlightRoute } from '../api/integrations';
import { AIRCRAFT_KEYS, aircraftFromLookup } from '../utils/flightFields';
import AircraftDetails from './flights/AircraftDetails';
import { haversineMiles } from '../utils/geo';

const Inline = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${props => props.theme.space[4]};

  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

// Simple polyline encoder (Google Encoded Polyline Algorithm Format)
// Based on public-domain implementations. Keeps bundle tiny.
function encodeCoordinate(coordinate) {
  let result = '';
  let value = coordinate < 0 ? ~(coordinate << 1) : (coordinate << 1);
  while (value >= 0x20) {
    result += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }
  result += String.fromCharCode(value + 63);
  return result;
}

export function encodePolyline(points) {
  // points: [{lat, lon}]
  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lon * 1e5);

    const dLat = lat - lastLat;
    const dLng = lng - lastLng;

    result += encodeCoordinate(dLat);
    result += encodeCoordinate(dLng);

    lastLat = lat;
    lastLng = lng;
  }

  return result;
}

// OpenRouteService driving directions, proxied through the backend
// (the API key is set via ORS_API_KEY in .env and never reaches the browser).
async function fetchRouteORS({ start, end }) {
  // start/end: { lat, lon }
  const data = await fetchDrivingRoute(start, end);
  const durationSeconds = Math.round(data?.duration_seconds ?? 0);
  const distanceMiles = data?.distance_miles ?? 0; // already in miles
  const coords = data?.coordinates || [];
  const points = coords.map(([lng, lat]) => ({ lat, lon: lng }));
  const polyline = encodePolyline(points);
  return { durationSeconds, distanceMiles, polyline };
}

export const CarDetails = ({
  start,
  end,
  onAutoFill,
  initialMiles,
  initialDurationSeconds,
  initialPolyline
}) => {
  const [orsConfigured, setOrsConfigured] = useState(null); // null = unknown/loading
  const [miles, setMiles] = useState(initialMiles ?? '');
  const [duration, setDuration] = useState(initialDurationSeconds ?? ''); // seconds internally
  const [polyline, setPolyline] = useState(initialPolyline ?? '');
  const [loading, setLoading] = useState(false);
  const canFetch = orsConfigured && start?.lat && start?.lon && end?.lat && end?.lon;
  const [autoFetched, setAutoFetched] = useState(false);

  useEffect(() => {
    let active = true;
    getIntegrationStatus()
      .then(s => { if (active) setOrsConfigured(Boolean(s?.ors_configured)); })
      .catch(() => { if (active) setOrsConfigured(false); });
    return () => { active = false; };
  }, []);

  const doFetch = useCallback(async () => {
    if (!canFetch) return;
    setLoading(true);
    try {
      const { durationSeconds, distanceMiles, polyline } = await fetchRouteORS({ start, end });
      setMiles(distanceMiles.toFixed(1));
  setDuration(durationSeconds);
      setPolyline(polyline);
      onAutoFill?.({ miles: distanceMiles, driving_time_seconds: durationSeconds, polyline });
      setAutoFetched(true);
    } catch (e) {
      console.error(e);
      // alert('Failed to fetch driving details');
    } finally {
      setLoading(false);
    }
  }, [canFetch, end, onAutoFill, start]);

  // Auto-populate once when we have everything needed
  useEffect(() => {
    if (canFetch && !autoFetched && (miles === '' || duration === '' || polyline === '')) {
      doFetch();
    }
  }, [canFetch, autoFetched, miles, duration, polyline, doFetch]);

  // When user edits hours/minutes, propagate seconds to parent so it can be saved
  useEffect(() => {
    if (duration !== '') {
      onAutoFill?.({ driving_time_seconds: Number(duration) || 0, polyline });
    }
  }, [duration, polyline, onAutoFill]);

  const hours = Number.isFinite(Number(duration)) ? Math.floor(Number(duration) / 3600) : 0;
  const minutes = Number.isFinite(Number(duration)) ? Math.floor((Number(duration) % 3600) / 60) : 0;

  const onHoursChange = (e) => {
    const h = Math.max(0, parseInt(e.target.value || '0', 10));
    const newSeconds = h * 3600 + minutes * 60;
    setDuration(newSeconds);
  };

  const onMinutesChange = (e) => {
    let m = Math.max(0, parseInt(e.target.value || '0', 10));
    if (m > 59) m = 59;
    const newSeconds = hours * 3600 + m * 60;
    setDuration(newSeconds);
  };

  return (
    <div>
      <Text variant="secondary">Driving details (auto-filled via OpenRouteService; you can edit):</Text>
      {orsConfigured === false && (
        <Text variant="muted">Set ORS_API_KEY in .env to enable auto-fill.</Text>
      )}
      <Flex gap={4}>
        <Button type="button" variant="outline" disabled={!canFetch || loading} onClick={doFetch}>
          {loading ? 'Fetching…' : 'Auto-fill from ORS'}
        </Button>
      </Flex>

      <Inline>
        {/* <FormGroup>
          <Label htmlFor="miles">Miles</Label>
          <Input id="miles" type="number" step="0.1" value={miles} onChange={e => setMiles(e.target.value)} />
        </FormGroup> */}
        <FormGroup>
          <Label>Duration (hh:mm)</Label>
          <Flex gap={3}>
            <Input aria-label="Hours" type="number" min="0" value={hours} onChange={onHoursChange} />
            <Input aria-label="Minutes" type="number" min="0" max="59" value={minutes} onChange={onMinutesChange} />
          </Flex>
        </FormGroup>
      </Inline>
    </div>
  );
};

export { haversineMiles };

// Recorded flight path via OpenSky (proxied through the backend, which holds the
// OpenSky credentials). OpenSky publishes flights the day after they fly and keeps
// tracks ~30 days; without a stored track the map draws the great-circle route.
const TRACK_RETENTION_DAYS = 30;

function trackAvailability(date) {
  if (!date) return 'Set the leg date first.';
  const day = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) return 'Set the leg date first.';
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const ageDays = Math.round((todayUtc - day.getTime()) / 86400000);
  if (ageDays < 1) return 'Available from the day after the flight.';
  if (ageDays > TRACK_RETENTION_DAYS) return `OpenSky only keeps tracks for about ${TRACK_RETENTION_DAYS} days.`;
  return null;
}

// Unix seconds -> "20 Nov 2026, 22:30 UTC". OpenSky only gives UTC times; the
// airport's local date can differ near midnight.
function formatUtc(seconds) {
  const d = new Date(seconds * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
}

const airportLabel = (a) => {
  if (!a) return null;
  const code = a.iata || a.icao;
  return a.name ? `${a.name}${code ? ` (${code})` : ''}` : code;
};

export const FlightDetails = ({
  start,
  end,
  date,
  onAutoFill,
  onRouteLookup, // ({ origin, destination }) after a flight-number lookup; airports have latitude/longitude
  initialFlightNumber,
  initialAirline,
  initialStartAirport,
  initialEndAirport,
  initialPolyline,
  initialTrackSource,
  initialAircraft, // aircraft_* form fields
  defaultStartAirport, // suggestions adopted into fields the user hasn't typed in
  defaultEndAirport,
}) => {
  const uid = useId();
  const [flightNumber, setFlightNumber] = useState(initialFlightNumber || '');
  const [airline, setAirline] = useState(initialAirline || '');
  const [startAirport, setStartAirport] = useState(initialStartAirport || '');
  const [endAirport, setEndAirport] = useState(initialEndAirport || '');
  const [track, setTrack] = useState({ polyline: initialPolyline || '', source: initialTrackSource || '' });
  const [aircraft, setAircraft] = useState(() => Object.fromEntries(AIRCRAFT_KEYS.map(k => [k, initialAircraft?.[k] || ''])));
  const updateAircraft = useCallback((patch) => setAircraft(prev => ({ ...prev, ...patch })), []);
  const [openskyConfigured, setOpenskyConfigured] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [trackMessage, setTrackMessage] = useState(null); // { text, error }
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState(null); // { text, error }
  // Airport fields with a value the user typed (or a lookup set) aren't replaced by defaults
  const pinned = useRef({ start: Boolean(initialStartAirport), end: Boolean(initialEndAirport) });
  const lastLookedUp = useRef((initialFlightNumber || '').trim().toUpperCase());
  const lookupInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    getIntegrationStatus()
      .then(s => { if (active) setOpenskyConfigured(Boolean(s?.opensky_configured)); })
      .catch(() => { if (active) setOpenskyConfigured(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (defaultStartAirport !== undefined && !pinned.current.start) setStartAirport(defaultStartAirport || '');
  }, [defaultStartAirport]);
  useEffect(() => {
    if (defaultEndAirport !== undefined && !pinned.current.end) setEndAirport(defaultEndAirport || '');
  }, [defaultEndAirport]);

  // Auto-calc miles when coords available
  useEffect(() => {
    if (start?.lat && start?.lon && end?.lat && end?.lon) {
      const miles = haversineMiles(Number(start.lat), Number(start.lon), Number(end.lat), Number(end.lon));
      // Propagate up so parent can set leg miles
      onAutoFill?.({ miles });
    }
  }, [start?.lat, start?.lon, end?.lat, end?.lon, onAutoFill]);

  // Push field edits upwards so they can be saved
  useEffect(() => {
    onAutoFill?.({
      flight_number: flightNumber,
      airline,
      start_airport: startAirport,
      end_airport: endAirport,
      flight_polyline: track.polyline,
      flight_track_source: track.source,
      ...aircraft,
    });
  }, [flightNumber, airline, startAirport, endAirport, track, aircraft, onAutoFill]);

  const lookupRoute = async () => {
    const number = flightNumber.trim();
    if (number.length < 3 || lookupInFlight.current) return; // blur + click can both fire
    lookupInFlight.current = true;
    lastLookedUp.current = number.toUpperCase();
    setLookingUp(true);
    setLookupMessage(null);
    try {
      const data = await lookupFlightRoute(number);
      const origin = data?.origin;
      const destination = data?.destination;
      const originCode = origin?.iata || origin?.icao;
      const destinationCode = destination?.iata || destination?.icao;
      if (data?.airline?.name && !airline.trim()) setAirline(data.airline.name);
      if (originCode && (!startAirport.trim() || !pinned.current.start)) {
        setStartAirport(originCode);
        pinned.current.start = true;
      }
      if (destinationCode && (!endAirport.trim() || !pinned.current.end)) {
        setEndAirport(destinationCode);
        pinned.current.end = true;
      }
      onRouteLookup?.({ origin, destination });
      const route = [airportLabel(origin), airportLabel(destination)].filter(Boolean).join(' → ');
      setLookupMessage({
        text: `${data?.callsign || number.toUpperCase()}${data?.airline?.name ? ` (${data.airline.name})` : ''}${route ? `: ${route}` : ''}. This is the route the flight number flies today.`,
      });
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setLookupMessage({ text: typeof detail === 'string' ? detail : 'Could not look up this flight.', error: true });
    } finally {
      lookupInFlight.current = false;
      setLookingUp(false);
    }
  };

  const onFlightNumberBlur = () => {
    const number = flightNumber.trim().toUpperCase();
    if (number.length >= 3 && number !== lastLookedUp.current) lookupRoute();
  };

  const unavailableReason = trackAvailability(date);
  const canFetchTrack = openskyConfigured && flightNumber.trim() && !unavailableReason && !fetching;

  const fetchTrack = async () => {
    if (!canFetchTrack) return;
    setFetching(true);
    setTrackMessage(null);
    try {
      const data = await fetchFlightTrack({
        flight_number: flightNumber.trim(),
        date,
        start_airport: startAirport.trim(),
        end_airport: endAirport.trim(),
      });
      const points = (data?.coordinates || []).map(([lon, lat]) => ({ lat, lon }));
      setTrack({ polyline: encodePolyline(points), source: data?.source || 'opensky' });
      if (data?.aircraft) setAircraft(aircraftFromLookup(data.aircraft));
      // Fill in airport codes the user left blank
      const origin = data?.route?.origin;
      const destination = data?.route?.destination;
      if (!startAirport.trim()) setStartAirport(origin?.iata || data?.departure_airport || '');
      if (!endAirport.trim()) setEndAirport(destination?.iata || data?.arrival_airport || '');
      const route = [data?.departure_airport, data?.arrival_airport].filter(Boolean).join(' → ');
      const departed = data?.first_seen ? formatUtc(data.first_seen) : null;
      setTrackMessage({
        text: `Found ${data?.callsign}${route ? ` ${route}` : ''}${departed ? `, departed ${departed}` : ''}: ${points.length} track points. Check the date, then save the leg to keep it.`,
      });
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setTrackMessage({ text: typeof detail === 'string' ? detail : 'Could not fetch the flight path.', error: true });
    } finally {
      setFetching(false);
    }
  };

  const clearTrack = () => {
    setTrack({ polyline: '', source: '' });
    setTrackMessage({ text: 'Recorded path removed. Save the leg to use the great-circle route.' });
  };

  return (
    <div>
      <Text variant="secondary">Flight details</Text>
      <Inline>
        <FormGroup>
          <Label htmlFor={`${uid}-flightNumber`}>Flight Number</Label>
          <Flex gap={3}>
            <Input
              id={`${uid}-flightNumber`}
              placeholder="e.g. BA117"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              onBlur={onFlightNumberBlur}
              style={{ flex: 1 }}
            />
            <Button type="button" size="sm" variant="outline" disabled={lookingUp || flightNumber.trim().length < 3} onClick={lookupRoute}>
              {lookingUp ? 'Looking up…' : 'Look up'}
            </Button>
          </Flex>
        </FormGroup>
        <FormGroup>
          <Label htmlFor={`${uid}-airline`}>Airline</Label>
          <Input id={`${uid}-airline`} value={airline} onChange={(e) => setAirline(e.target.value)} />
        </FormGroup>
      </Inline>
      {lookupMessage && (
        <Text variant={lookupMessage.error ? 'danger' : 'muted'} size="sm" style={{ display: 'block', marginBottom: 6 }}>
          {lookupMessage.text}
        </Text>
      )}
      <Inline>
        <FormGroup>
          <Label htmlFor={`${uid}-startAirport`}>Start Airport</Label>
          <Input
            id={`${uid}-startAirport`}
            placeholder="e.g. LHR"
            value={startAirport}
            onChange={(e) => { pinned.current.start = Boolean(e.target.value.trim()); setStartAirport(e.target.value); }}
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor={`${uid}-endAirport`}>End Airport</Label>
          <Input
            id={`${uid}-endAirport`}
            placeholder="e.g. JFK"
            value={endAirport}
            onChange={(e) => { pinned.current.end = Boolean(e.target.value.trim()); setEndAirport(e.target.value); }}
          />
        </FormGroup>
      </Inline>

      <AircraftDetails value={aircraft} onChange={updateAircraft} />

      <FormGroup>
        <Label>Flight path</Label>
        <Text variant="muted" size="sm" style={{ display: 'block' }}>
          {track.polyline
            ? `Recorded track${track.source ? ` from ${track.source === 'opensky' ? 'OpenSky' : track.source}` : ''}.`
            : 'No recorded track: the map shows the great-circle route.'}
        </Text>
        <Flex gap={3} style={{ flexWrap: 'wrap', marginTop: 6 }}>
          <Button type="button" size="sm" variant="outline" disabled={!canFetchTrack} onClick={fetchTrack}>
            {fetching ? 'Fetching…' : track.polyline ? 'Re-fetch from OpenSky' : 'Fetch flown path (OpenSky)'}
          </Button>
          {track.polyline && (
            <Button type="button" size="sm" variant="outline" disabled={fetching} onClick={clearTrack}>
              Use great-circle route
            </Button>
          )}
        </Flex>
        {openskyConfigured === false && (
          <Text variant="muted" size="sm" style={{ display: 'block', marginTop: 6 }}>
            Set OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET in .env to enable.
          </Text>
        )}
        {openskyConfigured && unavailableReason && (
          <Text variant="muted" size="sm" style={{ display: 'block', marginTop: 6 }}>{unavailableReason}</Text>
        )}
        {trackMessage && (
          <Text variant={trackMessage.error ? 'danger' : 'muted'} size="sm" style={{ display: 'block', marginTop: 6 }}>
            {trackMessage.text}
          </Text>
        )}
      </FormGroup>
    </div>
  );
};
