import React from 'react';
import styled from 'styled-components';

const Figure = styled.figure`
  margin: 0;
  width: ${p => p.$width || '100%'};
  max-width: 100%;

  img {
    display: block;
    width: 100%;
    aspect-ratio: 3 / 2;
    object-fit: cover;
    border-radius: 8px;
    background: ${p => p.theme.colors.backgroundTertiary};
  }

  figcaption {
    margin-top: 2px;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  a { color: inherit; }
`;

// A downloaded aircraft photo with its required photographer credit.
// flight: anything with aircraft_photo / aircraft_photo_credit / aircraft_photo_link.
export default function AircraftPhoto({ flight, width, caption = true }) {
  if (!flight?.aircraft_photo) return null;
  const credit = flight.aircraft_photo_credit ? `© ${flight.aircraft_photo_credit}` : 'Photo';
  return (
    <Figure $width={width}>
      <img src={flight.aircraft_photo} alt={flight.aircraft_registration || 'Aircraft'} title={credit} loading="lazy" />
      {caption && (
        <figcaption>
          {flight.aircraft_photo_link
            ? <a href={flight.aircraft_photo_link} target="_blank" rel="noreferrer">{credit}</a>
            : credit}
        </figcaption>
      )}
    </Figure>
  );
}
