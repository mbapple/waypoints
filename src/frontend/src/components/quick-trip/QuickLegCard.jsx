import React, { useCallback, useId, useMemo, useRef } from 'react';
import { Input, Flex } from '../../styles/components';
import { PlaceSearchInput } from '../map-integration-components';
import { CarDetails, FlightDetails } from '../leg-details-components';
import { placeToLegStart, placeToLegEnd } from '../../utils/places';
import { TRANSPORT_TYPES, ROAD_TYPES } from '../../utils/quickTrip';
import { LegConnector, LegTitle, FieldGrid, QInput, QSelect, More, Hint, LinkButton } from './quick-trip-styles';
import QuickField from './QuickField';
import { FLIGHT_FORM_KEYS, pickFlightFields } from '../../utils/flightFields';

const MILES_LABELS = {
  road: 'auto · road route',
  'great-circle': 'auto · great circle',
  'straight-line': 'auto · straight line',
};

const SOURCE_LABELS = { node: 'the stop', airport: 'the airport', override: 'your override' };

const clearedStart = placeToLegStart({});
const clearedEnd = placeToLegEnd({});

// The leg between two stops. leg: raw leg state (may be undefined); resolved: the
// resolved leg. onChange(uid, patch | prev => patch | null) must be stable.
export default function QuickLegCard({ leg, resolved, errors, showErrors, onChange, localPlaces }) {
  const uid = useId();
  const legUid = resolved.uid;
  const err = (field) => (showErrors ? errors[`leg.${legUid}.${field}`] : undefined);
  const raw = leg || {};
  const type = resolved.type;
  const isRoad = ROAD_TYPES.has(type);

  // Stable point objects, so CarDetails/FlightDetails effects only re-run on real changes
  const startLat = resolved.start.lat;
  const startLon = resolved.start.lon;
  const endLat = resolved.end.lat;
  const endLon = resolved.end.lon;
  const start = useMemo(() => ({ lat: Number(startLat), lon: Number(startLon) }), [startLat, startLon]);
  const end = useMemo(() => ({ lat: Number(endLat), lon: Number(endLon) }), [endLat, endLon]);

  // Car results are stamped with the endpoints they were fetched for
  const keyRef = useRef(resolved.key);
  keyRef.current = resolved.key;

  const update = useCallback((patch) => onChange(legUid, patch), [onChange, legUid]);

  const handleCarAutoFill = useCallback((data) => {
    onChange(legUid, (prev) => {
      const key = keyRef.current;
      const base = prev.car && prev.car.key === key ? prev.car : { key };
      const next = {
        ...base,
        ...(typeof data?.miles === 'number' ? { miles: data.miles } : {}),
        ...(data?.driving_time_seconds !== undefined ? { driving_time_seconds: data.driving_time_seconds } : {}),
        ...(data?.polyline !== undefined ? { polyline: data.polyline } : {}),
      };
      const same = prev.car && Object.keys(next).every(k => prev.car[k] === next[k]);
      return same ? null : { car: next };
    });
  }, [onChange, legUid]);

  const handleFlightAutoFill = useCallback((data) => {
    onChange(legUid, (prev) => {
      // Miles come from the resolver; only keep the flight fields
      const fields = pickFlightFields(data);
      if (!Object.keys(fields).length) return null;
      const next = { ...(prev.flight || {}), ...fields };
      const same = prev.flight && FLIGHT_FORM_KEYS.every(k => prev.flight[k] === next[k]);
      return same ? null : { flight: next };
    });
  }, [onChange, legUid]);

  const handleRouteLookup = useCallback(({ origin, destination }) => {
    onChange(legUid, { startAirport: origin || null, endAirport: destination || null });
  }, [onChange, legUid]);

  const carValid = resolved.car; // null unless fetched for the current endpoints
  const milesAuto = resolved.auto.miles;

  const endpointRow = (prefix, point) => {
    const isStart = prefix === 'start';
    const hasOverride = point.source !== 'node';
    return (
      <QuickField
        id={`${uid}-${prefix}`}
        label={isStart ? 'Start location' : 'End location'}
        hint={`Using ${SOURCE_LABELS[point.source]}${point.osm_name ? `: ${point.osm_name}` : ''}`}
      >
        <PlaceSearchInput
          placeholder={isStart ? 'Override the start…' : 'Override the end…'}
          value={raw[`${prefix}_osm_name`] || ''}
          localPlaces={localPlaces}
          onChange={(e) => {
            const value = e.target.value;
            update(prev => (value === prev[`${prefix}_osm_name`] ? null : {
              ...(isStart ? clearedStart : clearedEnd),
              [`${prefix}_osm_name`]: value,
            }));
          }}
          onPlaceSelect={(place) => update(isStart ? placeToLegStart(place) : placeToLegEnd(place))}
        />
        {hasOverride && (
          <LinkButton
            type="button"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => update({ ...(isStart ? clearedStart : clearedEnd), [isStart ? 'startAirport' : 'endAirport']: null })}
          >
            Use the stop instead
          </LinkButton>
        )}
      </QuickField>
    );
  };

  const invalid = Boolean(err('type') || err('date'));

  return (
    <LegConnector $invalid={invalid}>
      <LegTitle>{resolved.fromName} → {resolved.toName}</LegTitle>

      <FieldGrid $cols={3}>
        <QuickField
          id={`${uid}-type`}
          label="Travel by *"
          auto={resolved.auto.type}
          autoLabel="same as before"
          error={err('type')}
        >
          <QSelect
            id={`${uid}-type`}
            $auto={resolved.auto.type}
            $invalid={Boolean(err('type'))}
            value={type}
            onChange={(e) => update({ type: e.target.value })}
          >
            <option value="">Choose…</option>
            {TRANSPORT_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </QSelect>
        </QuickField>

        <QuickField id={`${uid}-date`} label="Date *" auto={resolved.auto.date} error={err('date')}>
          <QInput
            id={`${uid}-date`}
            type="date"
            $auto={resolved.auto.date}
            $invalid={Boolean(err('date'))}
            value={resolved.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </QuickField>

        <QuickField
          id={`${uid}-miles`}
          label="Miles"
          auto={milesAuto}
          autoLabel={MILES_LABELS[resolved.milesSource] || 'auto'}
          onReset={raw.miles !== '' && raw.miles != null ? () => update({ miles: '' }) : undefined}
        >
          <QInput
            id={`${uid}-miles`}
            type="number"
            step="0.1"
            min="0"
            $auto={milesAuto}
            value={resolved.miles}
            onChange={(e) => update({ miles: e.target.value })}
          />
        </QuickField>
      </FieldGrid>

      {isRoad && (
        <CarDetails
          key={resolved.key || 'no-endpoints'}
          start={start}
          end={end}
          initialMiles={carValid?.miles}
          initialDurationSeconds={carValid?.driving_time_seconds}
          initialPolyline={carValid?.polyline}
          onAutoFill={handleCarAutoFill}
        />
      )}

      {type === 'flight' && (
        <FlightDetails
          start={start}
          end={end}
          date={resolved.date}
          initialFlightNumber={raw.flight?.flight_number}
          initialAirline={raw.flight?.airline}
          initialStartAirport={raw.flight?.start_airport}
          initialEndAirport={raw.flight?.end_airport}
          initialPolyline={raw.flight?.flight_polyline}
          initialTrackSource={raw.flight?.flight_track_source}
          initialAircraft={raw.flight}
          defaultStartAirport={resolved.defaultStartAirport}
          defaultEndAirport={resolved.defaultEndAirport}
          onAutoFill={handleFlightAutoFill}
          onRouteLookup={handleRouteLookup}
        />
      )}

      <More>
        <summary>More: start/end locations, notes</summary>
        <div>
          <FieldGrid $cols={2}>
            {endpointRow('start', resolved.start)}
            {endpointRow('end', resolved.end)}
          </FieldGrid>
          <QuickField id={`${uid}-notes`} label="Notes">
            <Input
              id={`${uid}-notes`}
              as="textarea"
              rows={2}
              value={raw.notes || ''}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </QuickField>
        </div>
      </More>

      {type === 'flight' && resolved.start.source === 'airport' && resolved.end.source === 'airport' && (
        <Flex>
          <Hint>Leg drawn between the airports found by the flight lookup.</Hint>
        </Flex>
      )}
    </LegConnector>
  );
}
