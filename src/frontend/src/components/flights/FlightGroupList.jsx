import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Badge, Text } from '../../styles/components';
import { formatNumber, formatDateRange } from '../../utils/format';
import { aircraftLabel } from '../../utils/aircraftTypes';
import { routeLabel } from '../../utils/flightGroups';
import AircraftPhoto from './AircraftPhoto';

const Row = styled.div`
  border-bottom: 1px solid ${p => p.theme.colors.border};
  background: ${p => (p.$selected ? p.theme.colors.surfaceHover : 'transparent')};
`;

const Header = styled.button`
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: grid;
  grid-template-columns: ${p => (p.$photo ? '72px minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto')};
  gap: ${p => p.theme.space[3]};
  align-items: center;
  padding: ${p => p.theme.space[2]} ${p => p.theme.space[3]};
  cursor: pointer;

  &:hover { background: ${p => p.theme.colors.surfaceHover}; }
  &:focus-visible { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: -2px; }
`;

const Name = styled.div`
  font-weight: ${p => p.theme.fontWeights.semibold};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Expanded = styled.div`
  padding: 0 ${p => p.theme.space[3]} ${p => p.theme.space[3]};
`;

const Flights = styled.ul`
  list-style: none;
  margin: ${p => p.theme.space[2]} 0 0;
  padding: 0;

  li {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: ${p => p.theme.space[2]};
    padding: 4px 0;
    font-size: ${p => p.theme.fontSizes.sm};
  }

  a { color: ${p => p.theme.colors.textSecondary}; }
`;

const oneLine = { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const plural = (n) => `${n} flight${n === 1 ? '' : 's'}`;

function FlightRows({ flights }) {
  return (
    <Flights>
      {flights.map(f => (
        <li key={f.leg_id}>
          <Text variant="muted" size="sm">{formatDateRange(f.date, f.date)}</Text>
          <div style={{ minWidth: 0 }}>
            <span style={oneLine}>{[f.flight_number, routeLabel(f)].filter(Boolean).join(' · ')}</span>
            <Text variant="muted" size="xs" style={oneLine}>
              {[aircraftLabel(f), f.airline].filter(Boolean).join(' · ')}
              {' · '}<Link to={`/trip/${f.trip_id}`}>{f.trip_name}</Link>
            </Text>
          </div>
        </li>
      ))}
    </Flights>
  );
}

// Groups of flights (utils/flightGroups.js) as selectable rows. With `expandable`,
// the selected row opens to show its photo (with credit) and its flights.
export default function FlightGroupList({ groups, selectedKey, onSelect, expandable = true }) {
  const withPhotos = groups.some(g => g.photo);
  return (
    <div>
      {groups.map(g => {
        const selected = g.key === selectedKey;
        return (
          <Row key={g.key || 'unknown'} $selected={selected}>
            <Header type="button" $photo={withPhotos} aria-expanded={expandable ? selected : undefined} onClick={() => onSelect(g.key)}>
              {withPhotos && (g.photo ? <AircraftPhoto flight={g.photo} caption={false} /> : <span />)}
              <div style={{ minWidth: 0 }}>
                <Name>{g.name}</Name>
                {g.detail && <Text variant="muted" size="xs" style={oneLine}>{g.detail}</Text>}
                <Text variant="muted" size="xs" style={oneLine}>
                  {expandable ? `${plural(g.flights.length)} · ` : ''}{formatNumber(Math.round(g.miles))} mi
                </Text>
              </div>
              {expandable && <Badge variant="primary">{g.flights.length}</Badge>}
            </Header>
            {selected && (expandable || g.photo) && (
              <Expanded>
                {g.photo && <AircraftPhoto flight={g.photo} width="240px" />}
                {expandable && <FlightRows flights={g.flights} />}
              </Expanded>
            )}
          </Row>
        );
      })}
    </div>
  );
}
