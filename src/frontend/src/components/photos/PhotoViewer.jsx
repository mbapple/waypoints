import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { API_ORIGIN } from '../../api/client';
import { deletePhoto } from '../../api/photos';
import ConfirmDeleteButton from '../common/ConfirmDeleteButton';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ExternalIcon } from '../common/Icons';

// Always dark (like any photo viewer), so it reads the same in both themes.
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10001; /* above Popup (9999) and ContextMenu (10000) */
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.94);
  color: #fff;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${p => p.theme.space[2]};
  padding: ${p => p.theme.space[2]} ${p => p.theme.space[3]};
  .counter {
    margin-right: auto;
    font-size: ${p => p.theme.fontSizes.sm};
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
  }
`;

const Tool = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  min-width: 36px;
  padding: 0 ${p => p.theme.space[3]};
  border: none;
  border-radius: ${p => p.theme.radii.md};
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: ${p => p.theme.fontSizes.sm};
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.22); color: #fff; }
  &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
`;

const Stage = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const Nav = styled(Tool)`
  position: absolute;
  top: 50%;
  ${p => (p.$side === 'left' ? 'left: 12px;' : 'right: 12px;')}
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.55);
  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    ${p => (p.$side === 'left' ? 'left: 4px;' : 'right: 4px;')}
  }
`;

const Caption = styled.p`
  margin: 0;
  padding: ${p => p.theme.space[2]} ${p => p.theme.space[4]} ${p => p.theme.space[3]};
  text-align: center;
  font-size: ${p => p.theme.fontSizes.sm};
  opacity: 0.85;
  white-space: pre-wrap;
`;

const src = (p) => (p.url.startsWith('http') ? p.url : `${API_ORIGIN}${p.url}`);

/**
 * Fullscreen photo viewer (fixed overlay, rendered into document.body).
 * - photos / startIndex: what to show
 * - onClose(index): called with the photo index the viewer was on
 * - onRemoved(photo): opt-in. When given, a remove action is shown ("Unlink from
 *   Immich" or "Delete photo"); the viewer deletes the photo row, then calls this
 *   so the parent can drop it from its list.
 */
export default function PhotoViewer({ photos: allPhotos = [], startIndex = 0, onClose, onRemoved }) {
  const [index, setIndex] = useState(startIndex);
  const [removedIds, setRemovedIds] = useState([]); // hidden at once, before the parent reloads
  const touchX = useRef(null);
  const photos = allPhotos.filter((p) => !removedIds.includes(p.id));
  const count = photos.length;
  const i = Math.min(index, Math.max(count - 1, 0));
  const photo = photos[i];

  const step = (d) => setIndex((n) => (Math.min(n, count - 1) + d + count) % count);
  const close = () => onClose?.(i);

  // Keys are captured at window level so Esc closes only the viewer, not a Popup underneath
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft' && count > 1) step(-1);
      else if (e.key === 'ArrowRight' && count > 1) step(1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // The last photo was removed
  useEffect(() => { if (!count) onClose?.(0); }, [count, onClose]);

  if (!photo) return null;

  const remove = async () => {
    try {
      await deletePhoto(photo.id);
    } catch (e) {
      window.alert(e?.response?.data?.detail || 'Could not remove the photo.');
      return;
    }
    setRemovedIds((ids) => [...ids, photo.id]);
    onRemoved(photo);
  };

  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - (touchX.current ?? e.changedTouches[0].clientX);
    touchX.current = null;
    if (count > 1 && Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  };

  // Stop propagation: React events bubble through portals, and the viewer may be
  // opened from inside a clickable card.
  return createPortal(
    <Overlay
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <TopBar>
        <span className="counter">{i + 1} / {count}</span>
        {photo.immich_asset_id && (
          <Tool as="a" href={`${API_ORIGIN}/api/integrations/immich/assets/${photo.immich_asset_id}/open`} target="_blank" rel="noopener noreferrer">
            <ExternalIcon size={14} /> Open in Immich
          </Tool>
        )}
        {onRemoved && (
          <ConfirmDeleteButton
            size="sm"
            onConfirm={remove}
            confirmMessage={photo.immich_asset_id
              ? 'Unlink this photo from WayPoints? It stays in Immich.'
              : 'Delete this photo? The uploaded file is removed and cannot be recovered.'}
          >
            {photo.immich_asset_id ? 'Unlink from Immich' : 'Delete photo'}
          </ConfirmDeleteButton>
        )}
        <Tool type="button" onClick={close} aria-label="Close viewer" autoFocus><CloseIcon size={18} /></Tool>
      </TopBar>
      <Stage
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={onTouchEnd}
      >
        <img key={photo.id || photo.url} src={src(photo)} alt={photo.description || `Photo ${i + 1}`} />
        {count > 1 && (
          <>
            <Nav type="button" $side="left" onClick={() => step(-1)} aria-label="Previous photo"><ChevronLeftIcon size={22} /></Nav>
            <Nav type="button" $side="right" onClick={() => step(1)} aria-label="Next photo"><ChevronRightIcon size={22} /></Nav>
          </>
        )}
      </Stage>
      {photo.description && <Caption>{photo.description}</Caption>}
    </Overlay>,
    document.body
  );
}
