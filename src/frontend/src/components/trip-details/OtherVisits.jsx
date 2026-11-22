import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Text } from '../../styles/components';
import { getTripsByOsm } from '../../api/trips';
import { fmtTripRange } from '../../utils/itinerary';

const Toggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${p => p.theme.space[2]};
  padding: ${p => p.theme.space[1]} 0;
  background: none;
  border: none;
  color: ${p => p.theme.colors.textSecondary};
  font-size: ${p => p.theme.fontSizes.sm};
  cursor: pointer;
  &:hover { color: ${p => p.theme.colors.text}; }
  &:focus-visible { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: 2px; }
`;

const Chevron = styled.span`
  display: inline-block;
  transition: transform 0.15s;
  transform: rotate(${p => (p.$open ? '90deg' : '0deg')});
`;

const List = styled.ul`
  list-style: none;
  margin: ${p => p.theme.space[1]} 0 0;
  padding: 0;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.md};
  li + li { border-top: 1px solid ${p => p.theme.colors.border}; }
  a {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: ${p => p.theme.space[1]} ${p => p.theme.space[3]};
    padding: ${p => p.theme.space[2]} ${p => p.theme.space[3]};
    text-decoration: none;
    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
  }
`;

// "Visited N other times": other trips that include this OSM place as a node or a stop.
const OtherVisits = ({ osmId, currentTripId }) => {
  const [trips, setTrips] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTrips([]);
    if (!osmId) return;
    let active = true;
    getTripsByOsm(osmId).then(t => { if (active) setTrips(t || []); }).catch(() => {});
    return () => { active = false; };
  }, [osmId]);

  const others = trips.filter(t => String(t.id) !== String(currentTripId));
  if (!others.length) return null;

  return (
    <div style={{ marginTop: '1rem' }}>
      <Toggle type="button" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <Chevron $open={open} aria-hidden="true">▸</Chevron>
        Visited {others.length} other {others.length === 1 ? 'time' : 'times'}
      </Toggle>
      {open && (
        <List>
          {others.map(t => (
            <li key={t.id}>
              <Link to={`/trip/${t.id}`}>
                <Text size="sm" weight="semibold">{t.name}</Text>
                <Text variant="muted" size="sm">{fmtTripRange(t.start_date, t.end_date)}</Text>
              </Link>
            </li>
          ))}
        </List>
      )}
    </div>
  );
};

export default OtherVisits;
