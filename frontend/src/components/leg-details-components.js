// Components and helpers for leg-specific detail capture (Car, etc.)
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Input, Label, FormGroup, Text, Button, Flex } from '../styles/components';

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

// OpenRouteService driving directions client (no key -> works only with demo if any). User will configure their own key via env.
async function fetchRouteORS({ start, end, apiKey }) {
  // start/end: { lat, lon }
  const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
  const body = {
    coordinates: [ [start.lon, start.lat], [end.lon, end.lat] ],
    units: 'mi'
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ORS error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const feat = data.features?.[0];
  const summary = feat?.properties?.summary;
  const durationSeconds = Math.round(summary?.duration ?? 0);
  const distanceMiles = summary?.distance ?? 0; // already in miles
  const coords = feat?.geometry?.coordinates || [];
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
  const [apiKey, setApiKey] = useState('');
  const [miles, setMiles] = useState(initialMiles ?? '');
  const [duration, setDuration] = useState(initialDurationSeconds ?? ''); // seconds internally
  const [polyline, setPolyline] = useState(initialPolyline ?? '');
  const [loading, setLoading] = useState(false);
  const canFetch = apiKey && start?.lat && start?.lon && end?.lat && end?.lon;
  const [autoFetched, setAutoFetched] = useState(false);

  useEffect(() => {
    // Optionally pull ORS key from env if exposed to client
    const k = window?.env?.REACT_APP_ORS_API_KEY || process.env.REACT_APP_ORS_API_KEY;
    if (k) setApiKey(k);
  }, []);

  const doFetch = useCallback(async () => {
    if (!canFetch) return;
    setLoading(true);
    try {
      const { durationSeconds, distanceMiles, polyline } = await fetchRouteORS({ start, end, apiKey });
      setMiles(distanceMiles.toFixed(1));
  setDuration(durationSeconds);
      setPolyline(polyline);
      onAutoFill?.({ miles: distanceMiles, driving_time_seconds: durationSeconds, polyline });
      setAutoFetched(true);
    } catch (e) {
      console.error(e);
      alert('Failed to fetch driving details');
    } finally {
      setLoading(false);
    }
  }, [apiKey, canFetch, end, onAutoFill, start]);

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
      {!apiKey && (
        <FormGroup>
          <Label htmlFor="orsKey">OpenRouteService API Key</Label>
          <Input id="orsKey" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter ORS key to auto-fill" />
        </FormGroup>
      )}
      <Flex gap={4}>
        <Button type="button" variant="outline" disabled={!canFetch || loading} onClick={doFetch}>
          {loading ? 'Fetching…' : 'Auto-fill from ORS'}
        </Button>
      </Flex>

      <Inline>
        <FormGroup>
          <Label htmlFor="miles">Miles</Label>
          <Input id="miles" type="number" step="0.1" value={miles} onChange={e => setMiles(e.target.value)} />
        </FormGroup>
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
