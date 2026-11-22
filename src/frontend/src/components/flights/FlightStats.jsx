import React from 'react';
import styled from 'styled-components';
import { Card } from '../../styles/components';
import { formatNumber } from '../../utils/format';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: ${p => p.theme.space[3]};
  margin-bottom: ${p => p.theme.space[4]};

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${p => p.theme.space[2]};
  }
`;

const Tile = styled(Card)`
  margin: 0;
  padding: ${p => p.theme.space[3]};
  text-align: center;

  strong {
    display: block;
    font-size: ${p => p.theme.fontSizes.xl};
    line-height: 1.1;
  }

  span {
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
  }
`;

const TILES = [
  ['flights', 'Flights'],
  ['miles', 'Miles flown'],
  ['airlines', 'Airlines'],
  ['types', 'Aircraft types'],
  ['aircraft', 'Unique aircraft'],
  ['airports', 'Airports'],
];

// Headline numbers from utils/flightGroups.js flightStats()
export default function FlightStats({ stats }) {
  return (
    <Grid>
      {TILES.map(([key, label]) => (
        <Tile key={key}>
          <strong>{formatNumber(Math.round(stats[key] || 0))}</strong>
          <span>{label}</span>
        </Tile>
      ))}
    </Grid>
  );
}
