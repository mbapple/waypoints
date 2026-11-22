import React, { useId, useState } from 'react';
import styled from 'styled-components';
import { Input, Label, FormGroup, Text, Button, Flex } from '../../styles/components';
import { lookupAircraft } from '../../api/integrations';
import { aircraftFromLookup } from '../../utils/flightFields';
import { aircraftTypeName } from '../../utils/aircraftTypes';
import AircraftPhoto from './AircraftPhoto';

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 160px;
  gap: ${p => p.theme.space[3]};
  align-items: start;

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

// Aircraft fields of a flight (controlled). value: aircraft_* form fields;
// onChange(patch). Typing a new registration drops the old airframe's id and photo.
export default function AircraftDetails({ value, onChange }) {
  const uid = useId();
  const [lookingUp, setLookingUp] = useState(false);
  const [message, setMessage] = useState(null); // { text, error }
  const registration = value.aircraft_registration || '';

  const lookup = async () => {
    if (!registration.trim() || lookingUp) return;
    setLookingUp(true);
    setMessage(null);
    try {
      const data = await lookupAircraft({ registration: registration.trim() });
      onChange(aircraftFromLookup(data));
      setMessage({ text: [aircraftTypeName(data.icao_type, data.type), data.operator].filter(Boolean).join(' · ') });
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setMessage({ text: typeof detail === 'string' ? detail : 'Could not look up this aircraft.', error: true });
    } finally {
      setLookingUp(false);
    }
  };

  const changeRegistration = (e) => onChange({
    aircraft_registration: e.target.value,
    aircraft_icao24: '',
    aircraft_photo: '',
    aircraft_photo_credit: '',
    aircraft_photo_link: '',
  });

  return (
    <FormGroup>
      <Label>Aircraft</Label>
      <Grid>
        <div>
          <Label htmlFor={`${uid}-reg`}>Registration</Label>
          <Flex gap={3}>
            <Input
              id={`${uid}-reg`}
              placeholder="e.g. G-YMMN"
              value={registration}
              onChange={changeRegistration}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } }}
              style={{ flex: 1 }}
            />
            <Button type="button" size="sm" variant="outline" disabled={lookingUp || !registration.trim()} onClick={lookup}>
              {lookingUp ? 'Looking up…' : 'Look up'}
            </Button>
          </Flex>
          <Label htmlFor={`${uid}-icao`} style={{ marginTop: 8 }}>ICAO type code</Label>
          <Input
            id={`${uid}-icao`}
            placeholder="e.g. B772"
            value={value.aircraft_icao_type || ''}
            onChange={(e) => onChange({ aircraft_icao_type: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={`${uid}-type`}>Type</Label>
          <Input
            id={`${uid}-type`}
            placeholder="e.g. Boeing 777 236ER"
            value={value.aircraft_type || ''}
            onChange={(e) => onChange({ aircraft_type: e.target.value })}
          />
          {message && (
            <Text variant={message.error ? 'danger' : 'muted'} size="sm" style={{ display: 'block', marginTop: 6 }}>
              {message.text}
            </Text>
          )}
        </div>
        <AircraftPhoto flight={value} />
      </Grid>
    </FormGroup>
  );
}
