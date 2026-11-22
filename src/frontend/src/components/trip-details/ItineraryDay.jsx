import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "styled-components";
import ItineraryStopCard, { photoSrc } from "./ItineraryStopCard";
import EntityMenu from "./EntityMenu";
import { TransportIcon, BedIcon, GlobeIcon, PlusIcon, PinIcon } from "../common/Icons";
import {
  DayCard, DayHeader, DateBlock, DayTitle, MetaRow, Dot, Pill, IconButton, LegList, LegRow,
  StopGrid, DayFooter, FooterLabel, InfoRow, Avatar, QuietDay,
} from "./itinerary-styles";
import { fmtDayParts, fmtLong, fmtShort, fmtSpan } from "../../utils/itinerary";

const MODE = { flight: ["flight", "flights"], car: ["drive", "drives"], train: ["train", "trains"], bus: ["bus", "buses"], boat: ["boat", "boats"] };
const plural = (n, [one, many]) => `${n} ${n === 1 ? one : many}`;
const fmtMiles = (m) => (m ? `${Number(m).toLocaleString(undefined, { maximumFractionDigits: 1 })} mi` : "");

function legMeta(seg) {
  const counts = seg.types.map((tp) => plural(seg.legs.filter((l) => (l.type || "").toLowerCase() === tp).length, MODE[tp] || ["leg", "legs"]));
  return [counts.join(", "), fmtMiles(seg.miles)].filter(Boolean).join(" · ");
}

/** A group of legs between two visible nodes, deliberately low-key: a dashed one-liner. */
export function LegLine({ seg, tripID, onOpen }) {
  // Leg i runs from (i === 0 ? from : via[i-1]) to (via[i] ?? to)
  const legRoute = (i) => `${(i === 0 ? seg.from : seg.via[i - 1])?.name || "?"} → ${(seg.via[i] || seg.to)?.name || "?"}`;
  return (
    <LegRow as="div" role="button" tabIndex={0}
      onClick={() => onOpen("leg", seg.legs[0])}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen("leg", seg.legs[0]); }}>
      <TransportIcon type={seg.types.length === 1 ? seg.types[0] : "mixed"} size={15} />
      <span className="route">
        <strong>{seg.from?.name || "?"}</strong> → <strong>{seg.to?.name || "?"}</strong>
        {seg.via.length > 0 && <> via {seg.via.map((n) => n.name).join(", ")}</>}
      </span>
      <span className="meta">{legMeta(seg)}</span>
      <EntityMenu bare label="Leg actions" items={seg.legs.map((l, i) => ({ label: seg.legs.length > 1 ? `Edit ${legRoute(i)}` : "Edit leg", to: `/trip/${tripID}/update-leg?legID=${l.id}` }))} />
    </LegRow>
  );
}

function LodgingRow({ entry, photos, onOpen }) {
  const { stop, night, nights, checkIn, checkOut } = entry;
  const photo = photos.stop.get(stop.id)?.[0];
  const sub = [nights > 1 && `Night ${night} of ${nights}`, stop.osm_name].filter(Boolean).join(" · ");
  return (
    <InfoRow type="button" onClick={() => onOpen("stop", stop)}>
      <Avatar>{photo ? <img src={photoSrc(photo)} alt="" /> : <BedIcon size={16} />}</Avatar>
      <span className="text">
        <span className="name">{stop.name}</span>
        {sub && <span className="sub">{sub}</span>}
      </span>
      {checkOut ? <Pill $solid>Check-out {fmtShort(checkOut)}</Pill> : checkIn && <Pill $solid>Check-in</Pill>}
    </InfoRow>
  );
}

function NodeRow({ node, date, photo, onOpen }) {
  const arriving = node.arrival_date === date && node.departure_date && node.departure_date !== date;
  const leaving = node.departure_date === date && node.arrival_date !== date;
  return (
    <InfoRow type="button" onClick={() => onOpen("node", node)}>
      <Avatar>{photo ? <img src={photoSrc(photo)} alt="" /> : <PinIcon size={16} />}</Avatar>
      <span className="text">
        <span className="name">{node.name}</span>
        {node.osm_name && node.osm_name !== node.name && <span className="sub">{node.osm_name}</span>}
      </span>
      <Pill $solid>{leaving ? "Leaving" : arriving ? "Arriving" : fmtSpan(node.arrival_date, node.departure_date)}</Pill>
    </InfoRow>
  );
}

export default function ItineraryDay({ day, tripID, photos, nodePhoto, legLabel, onOpen }) {
  const theme = useTheme();
  const { weekday, day: dnum, month } = fmtDayParts(day.date);
  const addStopLink = `/trip/${tripID}/add-stop?date=${day.date}${day.nodes[0] ? `&nodeID=${day.nodes[day.nodes.length - 1].id}` : ""}`;
  const addButton = (
    <IconButton as={Link} to={addStopLink} aria-label={`Add a stop on ${fmtLong(day.date)}`} title="Add a stop on this day">
      <PlusIcon size={16} />
    </IconButton>
  );
  const anchorId = `day-${day.date}`;

  // No stops, no legs, no new check-in: a single quiet line keeps long stays compact
  if (!day.stops.length && !day.legGroups.length && !day.lodging.some((l) => l.checkIn)) {
    const where = day.nodes.map((n) => n.name).join(" / ");
    const stay = day.lodging[0]?.stop.name;
    return (
      <QuietDay id={anchorId}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <strong>{weekday} {month} {dnum}</strong> · Day {day.dayNumber}
          {where ? ` · Free day in ${where}` : " · Nothing planned"}
          {stay && ` · staying at ${stay}`}
        </span>
        {addButton}
      </QuietDay>
    );
  }

  return (
    <DayCard id={anchorId} aria-label={fmtLong(day.date)}>
      <DayHeader>
        <DateBlock aria-hidden="true"><span>{weekday}</span><strong>{dnum}</strong><span>{month}</span></DateBlock>
        <DayTitle>
          <h3>{fmtLong(day.date)}</h3>
          <MetaRow>
            <span>Day {day.dayNumber} of {day.totalDays}</span>
            {day.itemCount > 0 && <><Dot /><span>{plural(day.itemCount, ["item", "items"])}</span></>}
            {day.legGroups.length > 0 && <Pill $color={theme.colors.secondary}>{day.legGroups.reduce((n, g) => n + g.legs.length, 0) === 1 ? "Leg" : "Legs"}</Pill>}
            {day.lodging.length > 0 && <Pill>Overnight</Pill>}
          </MetaRow>
        </DayTitle>
        {addButton}
      </DayHeader>

      {day.legGroups.length > 0 && (
        <LegList>
          {day.legGroups.map((seg) => <LegLine key={seg.key} seg={seg} tripID={tripID} onOpen={onOpen} />)}
        </LegList>
      )}

      {day.stops.length > 0 && (
        <StopGrid>
          {day.stops.map((s) => (
            <ItineraryStopCard key={s.id} stop={s} tripID={tripID} photos={photos.stop.get(s.id) || []}
              enRoute={s.leg_id ? legLabel(s.leg_id) : null} onOpen={(stop) => onOpen("stop", stop)} />
          ))}
        </StopGrid>
      )}

      {(day.lodging.length > 0 || day.nodes.length > 0) && (
        <DayFooter>
          {day.lodging.length > 0 && (
            <div>
              <FooterLabel><BedIcon size={14} /> Staying overnight</FooterLabel>
              {day.lodging.map((l) => <LodgingRow key={l.stop.id} entry={l} photos={photos} onOpen={onOpen} />)}
            </div>
          )}
          {day.nodes.length > 0 && (
            <div>
              <FooterLabel><GlobeIcon size={14} /> {day.nodes.length > 1 ? "Nodes" : "Node"}</FooterLabel>
              {day.nodes.map((n) => <NodeRow key={n.id} node={n} date={day.date} photo={nodePhoto(n.id)} onOpen={onOpen} />)}
            </div>
          )}
        </DayFooter>
      )}
    </DayCard>
  );
}
