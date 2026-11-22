import styled, { css } from "styled-components";

const t = (fn) => (p) => fn(p.theme);

/* ---------- Day card ---------- */

export const DayCard = styled.section`
  background: ${t((th) => th.colors.card)};
  border: 1px solid ${t((th) => th.colors.border)};
  border-radius: ${t((th) => th.radii.xl)};
  padding: 14px 16px 16px;
  box-shadow: ${t((th) => th.shadows.sm)};
  scroll-margin-top: 72px;
  @media (max-width: ${t((th) => th.breakpoints.sm)}) { padding: 12px; }
`;

export const DayHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const DateBlock = styled.div`
  flex: 0 0 auto;
  width: 52px;
  padding: 4px 0 5px;
  border-radius: ${t((th) => th.radii.lg)};
  background: ${t((th) => th.colors.backgroundSecondary)};
  text-align: center;
  line-height: 1.1;
  span { display: block; font-size: 0.68rem; color: ${t((th) => th.colors.textMuted)}; text-transform: uppercase; letter-spacing: 0.04em; }
  strong { display: block; font-size: 1.25rem; font-weight: 700; color: ${t((th) => th.colors.text)}; margin: 1px 0; }
`;

export const DayTitle = styled.div`
  flex: 1;
  min-width: 0;
  h3 { margin: 0; font-size: 1.05rem; font-weight: 700; line-height: 1.25; color: ${t((th) => th.colors.text)}; }
`;

export const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 0.8rem;
  color: ${t((th) => th.colors.textMuted)};
`;

export const Dot = styled.span`
  &::before { content: "·"; }
  color: ${t((th) => th.colors.textMuted)};
`;

export const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: ${t((th) => th.radii.full)};
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
  color: ${(p) => p.$color || p.theme.colors.primary};
  border: 1px solid ${(p) => p.$color || p.theme.colors.primary};
  background: transparent;
  ${(p) => p.$solid && css`
    background: ${p.theme.colors.backgroundSecondary};
    border-color: transparent;
    color: ${p.theme.colors.textSecondary};
  `}
`;

export const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  padding: 0;
  border-radius: ${t((th) => th.radii.md)};
  border: 1px solid ${(p) => (p.$bare ? "transparent" : p.theme.colors.border)};
  background: ${(p) => (p.$bare ? "transparent" : p.theme.colors.surface)};
  color: ${t((th) => th.colors.textSecondary)};
  cursor: pointer;
  text-decoration: none;
  transition: background ${t((th) => th.transitions.fast)}, color ${t((th) => th.transitions.fast)};
  &:hover { background: ${t((th) => th.colors.surfaceHover)}; color: ${t((th) => th.colors.text)}; }
  &:focus-visible { outline: 2px solid ${t((th) => th.colors.primary)}; outline-offset: 1px; }
`;

/* ---------- Legs (deliberately quiet) ---------- */

export const LegList = styled.div`
  display: grid;
  gap: 4px;
  margin-top: 12px;
`;

export const LegRow = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 5px 10px;
  border: 1px dashed ${t((th) => th.colors.border)};
  border-radius: ${t((th) => th.radii.lg)};
  background: transparent;
  color: ${t((th) => th.colors.textSecondary)};
  font: inherit;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
  svg { flex: 0 0 auto; color: ${t((th) => th.colors.textMuted)}; }
  &:hover { background: ${t((th) => th.colors.surfaceHover)}; }
  .route { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .route strong { font-weight: 600; color: ${t((th) => th.colors.text)}; }
  .meta { flex: 0 0 auto; color: ${t((th) => th.colors.textMuted)}; font-size: 0.75rem; }
`;

/* ---------- Stop cards ---------- */

export const StopGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
  margin-top: 12px;
  @media (max-width: ${t((th) => th.breakpoints.sm)}) {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }
`;

export const StopCardShell = styled.article`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border-radius: ${t((th) => th.radii.xl)};
  border: 1px solid ${t((th) => th.colors.border)};
  background: ${t((th) => th.colors.surface)};
  cursor: pointer;
  transition: box-shadow ${t((th) => th.transitions.fast)}, transform ${t((th) => th.transitions.fast)};
  &:hover { box-shadow: ${t((th) => th.shadows.lg)}; transform: translateY(-1px); }
  &:focus-visible { outline: 2px solid ${t((th) => th.colors.primary)}; outline-offset: 2px; }
`;

export const PhotoArea = styled.div`
  position: relative;
  aspect-ratio: 3 / 2;
  background: ${t((th) => th.colors.backgroundTertiary)};
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

export const PhotoPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  background: ${t((th) => th.colors.backgroundSecondary)};
  color: ${t((th) => th.colors.textMuted)};
`;

export const PhotoBadge = styled.span`
  position: absolute;
  ${(p) => (p.$right ? "right: 8px;" : "left: 8px;")}
  ${(p) => (p.$top ? "top: 8px;" : "bottom: 8px;")}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: calc(100% - 16px);
  padding: 2px 9px;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(4px);
`;

export const PhotoNav = styled.button`
  position: absolute;
  top: 50%;
  ${(p) => (p.$left ? "left: 6px;" : "right: 6px;")}
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  ${StopCardShell}:hover &, &:focus-visible { opacity: 1; }
  @media (hover: none) { opacity: 1; }
`;

// Opens the fullscreen photo viewer (bottom-right, clear of the category badge)
export const PhotoExpand = styled(PhotoNav)`
  top: auto;
  bottom: 8px;
  right: 8px;
  transform: none;
`;

export const StopBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 9px 10px 10px 12px;
  min-width: 0;
`;

export const StopTitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 4px;
  h4 {
    flex: 1;
    min-width: 0;
    margin: 4px 0 0;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.3;
    color: ${t((th) => th.colors.text)};
    overflow-wrap: anywhere;
  }
`;

export const SmallMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 0.75rem;
  color: ${t((th) => th.colors.textMuted)};
  svg { flex: 0 0 auto; color: ${(p) => p.$iconColor || p.theme.colors.success}; }
  span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

/* ---------- Footer: lodging + nodes ---------- */

export const DayFooter = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed ${t((th) => th.colors.border)};
`;

export const FooterLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${t((th) => th.colors.textMuted)};
`;

export const InfoRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid ${t((th) => th.colors.border)};
  border-radius: ${t((th) => th.radii.lg)};
  background: ${t((th) => th.colors.surface)};
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  & + & { margin-top: 6px; }
  &:hover { background: ${t((th) => th.colors.surfaceHover)}; }
  .text { flex: 1; min-width: 0; }
  .name { display: block; font-size: 0.85rem; font-weight: 600; color: ${t((th) => th.colors.text)}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub { display: block; font-size: 0.72rem; color: ${t((th) => th.colors.textMuted)}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

export const Avatar = styled.span`
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${t((th) => th.colors.backgroundSecondary)};
  color: ${t((th) => th.colors.textMuted)};
  img { width: 100%; height: 100%; object-fit: cover; }
`;

/* ---------- Compact day (nothing scheduled) ---------- */

export const QuietDay = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border: 1px dashed ${t((th) => th.colors.border)};
  border-radius: ${t((th) => th.radii.xl)};
  color: ${t((th) => th.colors.textMuted)};
  font-size: 0.85rem;
  scroll-margin-top: 72px;
  strong { color: ${t((th) => th.colors.textSecondary)}; font-weight: 600; }
`;
