import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { IconButton } from "./itinerary-styles";
import { MoreIcon } from "../common/Icons";

const Wrap = styled.div`
  position: relative;
  flex: 0 0 auto;
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 50;
  min-width: 170px;
  padding: 4px;
  border-radius: ${(p) => p.theme.radii.lg};
  border: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surface};
  box-shadow: ${(p) => p.theme.shadows.lg};
`;

const itemStyles = (p) => `
  display: block;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: ${p.theme.radii.md};
  background: transparent;
  color: ${p.theme.colors.text};
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  &:hover, &:focus-visible { background: ${p.theme.colors.surfaceHover}; outline: none; }
`;
const ItemLink = styled(Link)`${itemStyles}`;
const ItemAnchor = styled.a`${itemStyles}`;

/**
 * "⋯" button with a small themed dropdown.
 * items: [{ label, to }] for in-app links, [{ label, href }] for external links.
 * Clicks never reach the surrounding card (which opens the detail popup).
 */
export default function EntityMenu({ items, label = "More actions", bare = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const visible = items.filter(Boolean);
  if (!visible.length) return null;
  return (
    <Wrap ref={ref} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <IconButton type="button" $bare={bare} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MoreIcon size={16} />
      </IconButton>
      {open && (
        <Menu role="menu">
          {visible.map((it) => it.to ? (
            <ItemLink key={it.label} role="menuitem" to={it.to} onClick={() => setOpen(false)}>{it.label}</ItemLink>
          ) : (
            <ItemAnchor key={it.label} role="menuitem" href={it.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>{it.label}</ItemAnchor>
          ))}
        </Menu>
      )}
    </Wrap>
  );
}
