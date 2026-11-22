import styled from "styled-components";
import { Link } from "react-router-dom";

// Layout pieces for the trip details page (pages/TripDetails.jsx).

export const HERO_HEIGHT = 320;

export const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin: 4px 0 14px;
  h1 { margin: 0; font-size: 1.75rem; line-height: 1.2; }
  @media (max-width: ${(p) => p.theme.breakpoints.sm}) { h1 { font-size: 1.4rem; } }
`;

export const Crumb = styled(Link)`
  display: inline-block;
  margin-bottom: 2px;
  font-size: 0.8rem;
  color: ${(p) => p.theme.colors.textMuted};
  text-decoration: none;
  &:hover { color: ${(p) => p.theme.colors.primary}; }
`;

export const TripMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 4px;
  font-size: 0.875rem;
  color: ${(p) => p.theme.colors.textSecondary};
  span + span::before { content: "·"; margin-right: 10px; color: ${(p) => p.theme.colors.textMuted}; }
`;

export const Description = styled.p`
  margin: 6px 0 0;
  max-width: 70ch;
  font-size: 0.875rem;
  line-height: 1.5;
  color: ${(p) => p.theme.colors.textMuted};
`;

export const Actions = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  a, button { gap: 6px; }
`;

export const Hero = styled.div`
  display: grid;
  grid-template-columns: ${(p) => (p.$photos ? "minmax(0, 3fr) minmax(0, 2fr)" : "1fr")};
  gap: 12px;
  margin-bottom: 20px;
  .hero-map { height: ${HERO_HEIGHT}px; }
  @media (max-width: ${(p) => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    .hero-map { height: 240px; }
  }
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  h2 { margin: 0; font-size: 1.2rem; }
`;

export const PhotoBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 20px 0 32px;
  padding: 10px 12px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.xl};
  background: ${(p) => p.theme.colors.card};
  .label { display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; color: ${(p) => p.theme.colors.textSecondary}; }
  select { flex: 1 1 220px; width: auto; min-width: 0; }
`;
