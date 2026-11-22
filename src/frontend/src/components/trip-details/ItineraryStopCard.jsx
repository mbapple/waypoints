import React, { useState } from "react";
import { API_ORIGIN } from "../../api/client";
import { getStopEmoji } from "../../styles/mapTheme";
import { getPlaceLink } from "../map-integration-components";
import EntityMenu from "./EntityMenu";
import { PinIcon, ChevronLeftIcon, ChevronRightIcon, CameraIcon, ExpandIcon } from "../common/Icons";
import PhotoViewer from "../photos/PhotoViewer";
import {
  StopCardShell, PhotoArea, PhotoPlaceholder, PhotoBadge, PhotoNav, PhotoExpand, StopBody, StopTitleRow, SmallMeta,
} from "./itinerary-styles";
import { fmtShort } from "../../utils/itinerary";

export const photoSrc = (p) => (p.url.startsWith("http") ? p.url : `${API_ORIGIN}${p.url}`);
export const titleCase = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());

/** A stop as a photo-first card: image header, category pill, name, location. */
export default function ItineraryStopCard({ stop, photos = [], tripID, enRoute, onOpen }) {
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState({}); // photo id -> true when the image failed to load
  const [viewing, setViewing] = useState(false);
  const shown = idx % Math.max(photos.length, 1);
  const photo = photos[shown];
  const step = (d) => (e) => { e.stopPropagation(); setIdx((i) => (i + d + photos.length) % photos.length); };
  const multiDay = stop.start_date && stop.end_date && stop.end_date !== stop.start_date;
  const emoji = getStopEmoji(stop.category);

  return (
    <StopCardShell
      tabIndex={0}
      onClick={() => onOpen(stop)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(stop); }}
      aria-label={stop.name}
    >
      <PhotoArea>
        {photo && !failed[photo.id] ? (
          <img src={photoSrc(photo)} alt={photo.description || stop.name} loading="lazy" onError={() => setFailed((f) => ({ ...f, [photo.id]: true }))} />
        ) : <PhotoPlaceholder>{emoji}</PhotoPlaceholder>}
        {stop.category && <PhotoBadge>{titleCase(stop.category)} {emoji}</PhotoBadge>}
        {photos.length > 1 && (
          <>
            <PhotoBadge $top $right><CameraIcon size={11} /> {idx + 1}/{photos.length}</PhotoBadge>
            <PhotoNav $left type="button" aria-label="Previous photo" onClick={step(-1)}><ChevronLeftIcon size={14} /></PhotoNav>
            <PhotoNav type="button" aria-label="Next photo" onClick={step(1)}><ChevronRightIcon size={14} /></PhotoNav>
          </>
        )}
        {photo && (
          <PhotoExpand type="button" aria-label="View photos full screen" onClick={(e) => { e.stopPropagation(); setViewing(true); }} onKeyDown={(e) => e.stopPropagation()}>
            <ExpandIcon size={13} />
          </PhotoExpand>
        )}
      </PhotoArea>
      {viewing && (
        <PhotoViewer photos={photos} startIndex={shown} onClose={(i) => { setViewing(false); setIdx(i); }} />
      )}
      <StopBody>
        <StopTitleRow>
          <h4>{stop.name}</h4>
          <EntityMenu
            bare
            items={[
              { label: "Edit stop", to: `/trip/${tripID}/update-stop?stopID=${stop.id}` },
              stop.osm_id && { label: "Open in OpenStreetMap", href: getPlaceLink(stop.osm_id, stop.osm_name) },
            ]}
          />
        </StopTitleRow>
        {stop.osm_name && (
          <SmallMeta title={stop.osm_name}><PinIcon size={12} /><span>{stop.osm_name}</span></SmallMeta>
        )}
        {(multiDay || enRoute) && (
          <SmallMeta $iconColor="transparent">
            <span>
              {multiDay && `${fmtShort(stop.start_date)} – ${fmtShort(stop.end_date)}`}
              {multiDay && enRoute && " · "}
              {enRoute && `On leg: ${enRoute}`}
            </span>
          </SmallMeta>
        )}
      </StopBody>
    </StopCardShell>
  );
}
