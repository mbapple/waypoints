// Photo-first card used by the trip and adventure list pages: a full-bleed image
// header (or placeholder), then a compact body with title, muted meta line and pills.
import React from 'react';
import styled from 'styled-components';
import { Card } from '../../styles/components';

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${p => p.theme.space[4]};

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
    gap: ${p => p.theme.space[3]};
  }
`;

export const MediaCard = styled(Card)`
  padding: 0;
  margin-bottom: 0;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${p => p.theme.shadows.lg};
  }

  &:focus-visible {
    outline: 2px solid ${p => p.theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    padding: 0;
  }
`;

export const MediaPlaceholder = styled.div`
  height: ${p => p.$height || 200}px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${p => p.theme.colors.textMuted};
  background: linear-gradient(135deg, ${p => p.theme.colors.backgroundTertiary}, ${p => p.theme.colors.backgroundSecondary});
`;

export const MediaCardBody = styled.div`
  padding: ${p => p.theme.space[3]} ${p => p.theme.space[4]} ${p => p.theme.space[4]};
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.space[1]};
`;

export const MediaCardTitle = styled.h3`
  margin: 0;
  font-size: ${p => p.theme.fontSizes.base};
  font-weight: ${p => p.theme.fontWeights.semibold};
  line-height: ${p => p.theme.lineHeights.snug};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  a {
    color: inherit;
    text-decoration: none;
  }
`;

export const MetaLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${p => p.theme.space[1]} ${p => p.theme.space[3]};
  font-size: ${p => p.theme.fontSizes.sm};
  color: ${p => p.theme.colors.textMuted};
`;

export const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;

  svg {
    flex: none;
    opacity: 0.85;
  }
`;

export const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${p => p.theme.space[1]};
  margin-top: ${p => p.theme.space[1]};
`;

const Icon = ({ children, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const CalendarIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Icon>
);

export const MoonIcon = (props) => (
  <Icon {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Icon>
);

export const PinIcon = (props) => (
  <Icon {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);

export const MountainIcon = (props) => (
  <Icon {...props}>
    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
  </Icon>
);
