import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { API_ORIGIN } from '../../api/client';
import { ExpandIcon } from '../common/Icons';
import PhotoViewer from './PhotoViewer';

const SliderContainer = styled.div`
  width: 100%;
  height: ${p => p.$height || 420}px;
  border-radius: ${p => (p.$rounded ? p.theme.radii.xl : '0')};
  overflow: hidden;
  background: #0f172a;
  position: relative;
  cursor: ${p => (p.$expandable ? 'zoom-in' : 'auto')};

  /* Controls fade in on hover where hover exists; always visible on touch screens */
  @media (hover: hover) {
    .slideshow-nav { opacity: 0; }
    &:hover .slideshow-nav, .slideshow-nav:focus-visible { opacity: 1; }
  }
`;

const Slide = styled.div`
  position: absolute;
  inset: 0;
  opacity: ${p => (p.$active ? 1 : 0)};
  transition: opacity 400ms ease;
`;

const Img = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: ${p => p.$fit};
  background: #0b1220;
`;

const NavBtn = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${p => (p.$side === 'left' ? 'left: 8px;' : 'right: 8px;')}
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.55);
  color: white;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: opacity 0.15s ease-in-out, background 0.15s ease-in-out;

  &:hover { background: rgba(15, 23, 42, 0.8); }
  &:focus-visible { outline: 2px solid white; outline-offset: 2px; }
`;

const ExpandBtn = styled(NavBtn)`
  top: 8px;
  right: 8px;
  transform: none;
`;

const Dots = styled.div`
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 6px;
  pointer-events: none;
`;

const Dot = styled.button`
  width: 7px;
  height: 7px;
  padding: 0;
  border-radius: 50%;
  border: none;
  pointer-events: auto;
  background: ${p => (p.$active ? '#ffffff' : 'rgba(255,255,255,0.5)')};
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
`;

const Chevron = ({ dir }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
  </svg>
);

/**
 * Cross-fading photo slideshow.
 * - image_height: height in px (default 420)
 * - rounded: round all corners (default true). Pass false when the slideshow is a
 *   full-bleed card header and the card clips the corners itself.
 * - fit: CSS object-fit for the photos (default 'cover'; 'contain' letterboxes)
 * - expandable: clicking the slideshow (or its expand button) opens the fullscreen
 *   PhotoViewer (default false, so cards and map popups keep their behaviour)
 * - onPhotoRemoved(photo): with expandable, lets the viewer unlink/delete photos;
 *   the parent should drop the photo from `photos`
 */
export default function PhotoSlideshowLarge({ photos = [], image_height, rounded = true, fit = 'cover', expandable = false, onPhotoRemoved }) {
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    if (!photos.length) return;
    if (index >= photos.length) setIndex(0);
  }, [photos, index]);

  // Controls stop propagation so a slideshow inside a clickable card (trip/adventure
  // lists) can change photo without triggering the card's navigation.
  const prev = (e) => { e.stopPropagation(); setIndex(i => (i - 1 + photos.length) % photos.length); };
  const next = (e) => { e.stopPropagation(); setIndex(i => (i + 1) % photos.length); };
  const show = (e, i) => { e.stopPropagation(); setIndex(i); };
  const openViewer = (e) => { e.stopPropagation(); setViewing(true); };

  return (
    <SliderContainer $height={image_height} $rounded={rounded} $expandable={expandable} onClick={expandable ? openViewer : undefined}>
      {photos.map((p, i) => (
        <Slide key={p.id || p.url || i} $active={i === index} aria-hidden={i !== index}>
          <Img
            $fit={fit}
            src={p.url.startsWith('http') ? p.url : `${API_ORIGIN}${p.url}`}
            alt={p.description || `Photo ${i + 1}`}
            loading="lazy"
            decoding="async"
          />
        </Slide>
      ))}
      {photos.length > 1 && (
        <>
          <NavBtn className="slideshow-nav" $side="left" onClick={prev} aria-label="Previous photo"><Chevron dir="left" /></NavBtn>
          <NavBtn className="slideshow-nav" $side="right" onClick={next} aria-label="Next photo"><Chevron dir="right" /></NavBtn>
          <Dots>
            {photos.map((_, i) => (
              <Dot key={i} $active={i === index} onClick={e => show(e, i)} aria-label={`Show photo ${i + 1}`} />
            ))}
          </Dots>
        </>
      )}
      {expandable && photos.length > 0 && (
        <ExpandBtn className="slideshow-nav" type="button" onClick={openViewer} aria-label="View photos full screen"><ExpandIcon size={15} /></ExpandBtn>
      )}
      {viewing && (
        <PhotoViewer
          photos={photos}
          startIndex={Math.min(index, photos.length - 1)}
          onClose={(i) => { setViewing(false); setIndex(i); }}
          onRemoved={onPhotoRemoved}
        />
      )}
    </SliderContainer>
  );
}
