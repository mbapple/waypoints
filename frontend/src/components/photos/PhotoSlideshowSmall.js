import React from 'react';
import styled from 'styled-components';
import { API_ORIGIN } from '../../api/client';

const SmallSlider = styled.div`
  width: 100%;
  height: 140px;
  border-radius: 10px;
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  background: #0f172a;
`;

const Thumb = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.95);
`;

export default function PhotoSlideshowSmall({ photos = [] }) {
  const thumbs = photos.slice(0, 5);
  if (!thumbs.length) return null;
  return (
    <SmallSlider>
      {thumbs.map((p, i) => (
  <Thumb key={p.id || p.url || i} src={p.url.startsWith('http') ? p.url : `${API_ORIGIN}${p.url}`} alt={p.description || `Photo ${i+1}`} />
      ))}
    </SmallSlider>
  );
}
