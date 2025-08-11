import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { API_ORIGIN } from '../../api/client';

const SliderContainer = styled.div`
  width: 100%;
  height: 420px;
  border-radius: 12px;
  overflow: hidden;
  background: #0f172a;
  position: relative;
`;

const Slide = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  inset: 0;
  opacity: ${p => (p.active ? 1 : 0)};
  transition: opacity 400ms ease;
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #0b1220;
`;

const NavBtn = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.4);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  ${p => (p.left ? 'left: 8px;' : 'right: 8px;')}
`;

const Dots = styled.div`
  position: absolute;
  bottom: 8px;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 8px;
`;

const Dot = styled.button`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: ${p => (p.active ? '#6366f1' : 'rgba(255,255,255,0.4)')};
`;

export default function PhotoSlideshowLarge({ photos = [] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!photos.length) return;
    if (index >= photos.length) setIndex(0);
  }, [photos, index]);

  const prev = () => setIndex(i => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex(i => (i + 1) % photos.length);

  return (
    <SliderContainer>
      {photos.map((p, i) => (
        <Slide key={p.id || p.url || i} active={i === index}>
          <Img src={p.url.startsWith('http') ? p.url : `${API_ORIGIN}${p.url}`} alt={p.description || `Photo ${i+1}`} />
        </Slide>
      ))}
      {photos.length > 1 && (
        <>
          <NavBtn left onClick={prev}>{'<'}</NavBtn>
          <NavBtn onClick={next}>{'>'}</NavBtn>
          <Dots>
            {photos.map((_, i) => (
              <Dot key={i} active={i === index} onClick={() => setIndex(i)} />)
            )}
          </Dots>
        </>
      )}
    </SliderContainer>
  );
}
