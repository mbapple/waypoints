import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { getTrip } from "../../api/trips";
import { fmtTripRange } from "../../utils/itinerary";

const Banner = styled.div`
  margin-bottom: ${props => props.theme.space[4]};
  padding-bottom: ${props => props.theme.space[3]};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.textMuted};

  strong {
    color: ${props => props.theme.colors.text};
  }
`;

// Top-of-form line on the Add and Update pages:
// "Adding stop to Family Trip · Jun 6 – 8, 2026" / "Editing stop in Family Trip · …"
export default function TripContext({ tripID, what, editing = false }) {
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getTrip(tripID).then(t => { if (!cancelled) setTrip(t); }).catch(console.error);
    return () => { cancelled = true; };
  }, [tripID]);

  if (!trip) return null;
  const range = fmtTripRange(trip.start_date, trip.end_date);
  return (
    <Banner>
      {editing ? `Editing ${what} in` : `Adding ${what} to`} <strong>{trip.name}</strong>{range && ` · ${range}`}
    </Banner>
  );
}
