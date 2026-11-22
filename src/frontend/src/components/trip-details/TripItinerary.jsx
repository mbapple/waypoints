import React, { useMemo } from "react";
import styled from "styled-components";
import ItineraryDay, { LegLine } from "./ItineraryDay";
import ItineraryStopCard from "./ItineraryStopCard";
import { DayCard, DayTitle, MetaRow, StopGrid, LegList, DayFooter, FooterLabel, InfoRow, Avatar } from "./itinerary-styles";
import { PinIcon } from "../common/Icons";
import { buildItinerary, photosByEntity, fmtSpan } from "../../utils/itinerary";

const Days = styled.div`
  display: grid;
  gap: 12px;
`;

const Empty = styled.div`
  padding: 28px 16px;
  text-align: center;
  border: 1px dashed ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.xl};
  color: ${(p) => p.theme.colors.textMuted};
  h3 { margin: 0 0 4px; font-size: 1rem; color: ${(p) => p.theme.colors.text}; }
`;

/**
 * Day-by-day itinerary for a trip.
 * onOpen(type, entity) opens the detail popup for a 'node' | 'leg' | 'stop'.
 */
export default function TripItinerary({ trip, tripID, nodes, legs, stops, photos, onOpen }) {
  const { days, unscheduled } = useMemo(() => buildItinerary({ trip, nodes, legs, stops }), [trip, nodes, legs, stops]);
  const byEntity = useMemo(() => photosByEntity(photos), [photos]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // A node's avatar: its own photo, else the first photo of a stop there
  const nodePhoto = (nodeId) =>
    byEntity.node.get(nodeId)?.[0] || stops.filter((s) => s.node_id === nodeId).map((s) => byEntity.stop.get(s.id)?.[0]).find(Boolean);
  const legLabel = (legId) => {
    const l = legs.find((x) => x.id === legId);
    if (!l) return null;
    return `${nodeById.get(l.start_node_id)?.name || "?"} → ${nodeById.get(l.end_node_id)?.name || "?"}`;
  };

  const hasUnscheduled = unscheduled.stops.length || unscheduled.legGroups.length || unscheduled.nodes.length;
  if (!days.length && !hasUnscheduled) {
    return (
      <Empty>
        <h3>Nothing planned yet</h3>
        Add a node, leg or stop to start building the itinerary.
      </Empty>
    );
  }

  return (
    <Days>
      {days.map((day) => (
        <ItineraryDay key={day.date} day={day} tripID={tripID} photos={byEntity} nodePhoto={nodePhoto} legLabel={legLabel} onOpen={onOpen} />
      ))}
      {hasUnscheduled > 0 && (
        <DayCard aria-label="Not scheduled">
          <DayTitle>
            <h3>Not scheduled</h3>
            <MetaRow>Nodes, legs and stops without a date inside the trip</MetaRow>
          </DayTitle>
          {unscheduled.legGroups.length > 0 && (
            <LegList>{unscheduled.legGroups.map((seg) => <LegLine key={seg.key} seg={seg} tripID={tripID} onOpen={onOpen} />)}</LegList>
          )}
          {unscheduled.stops.length > 0 && (
            <StopGrid>
              {unscheduled.stops.map((s) => (
                <ItineraryStopCard key={s.id} stop={s} tripID={tripID} photos={byEntity.stop.get(s.id) || []}
                  enRoute={s.leg_id ? legLabel(s.leg_id) : null} onOpen={(stop) => onOpen("stop", stop)} />
              ))}
            </StopGrid>
          )}
          {unscheduled.nodes.length > 0 && (
            <DayFooter>
              <div>
                <FooterLabel><PinIcon size={14} /> Nodes</FooterLabel>
                {unscheduled.nodes.map((n) => (
                  <InfoRow key={n.id} type="button" onClick={() => onOpen("node", n)}>
                    <Avatar><PinIcon size={16} /></Avatar>
                    <span className="text"><span className="name">{n.name}</span>{n.osm_name && <span className="sub">{n.osm_name}</span>}</span>
                    {fmtSpan(n.arrival_date, n.departure_date)}
                  </InfoRow>
                ))}
              </div>
            </DayFooter>
          )}
        </DayCard>
      )}
    </Days>
  );
}
