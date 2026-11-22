// Components and helpers for leg-specific detail capture (Car, etc.)
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Input, Label, FormGroup, Text, Button, Flex } from '../styles/components';
import { getIntegrationStatus, fetchDrivingRoute } from '../api/integrations';

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

// Haversine distance in miles
export function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 3958.7613; // Earth radius miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

export const FlightDetails = ({
  start,
  end,
  onAutoFill,
  initialFlightNumber,
  initialAirline,
  initialStartAirport,
  initialEndAirport,
}) => {
  const [flightNumber, setFlightNumber] = useState(initialFlightNumber || '');
  const [airline, setAirline] = useState(initialAirline || '');
  const [startAirport, setStartAirport] = useState(initialStartAirport || '');
  const [endAirport, setEndAirport] = useState(initialEndAirport || '');

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
    onAutoFill?.({ flight_number: flightNumber, airline, start_airport: startAirport, end_airport: endAirport });
  }, [flightNumber, airline, startAirport, endAirport, onAutoFill]);

  return (
    <div>
      <Text variant="secondary">Flight details</Text>
      <Inline>
        <FormGroup>
          <Label htmlFor="flightNumber">Flight Number</Label>
          <Input id="flightNumber" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="airline">Airline</Label>
          <Input id="airline" value={airline} onChange={(e) => setAirline(e.target.value)} />
        </FormGroup>
      </Inline>
      <Inline>
        <FormGroup>
          <Label htmlFor="startAirport">Start Airport</Label>
          <Input id="startAirport" value={startAirport} onChange={(e) => setStartAirport(e.target.value)} />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="endAirport">End Airport</Label>
          <Input id="endAirport" value={endAirport} onChange={(e) => setEndAirport(e.target.value)} />
        </FormGroup>
      </Inline>
    </div>
  );
};
