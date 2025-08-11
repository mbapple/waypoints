import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import * as topojson from "topojson-client";
import world110m from "world-atlas/countries-110m.json";
import usStates10m from "us-atlas/states-10m.json";
import L from "leaflet";

// Prepare GeoJSON FeatureCollections
const worldCountries = topojson.feature(world110m, world110m.objects.countries);
const usStates = topojson.feature(usStates10m, usStates10m.objects.states);

function normalizeBase(s) {
  return (s || "").toString().trim().toLowerCase();
}

// Country synonyms → world-atlas names
const COUNTRY_SYNONYMS = new Map([
  ["united states", "united states of america"],
  ["usa", "united states of america"],
  ["u.s.", "united states of america"],
  ["u.s.a.", "united states of america"],
  ["russia", "russian federation"],
  ["czech republic", "czechia"],
  ["laos", "lao people's democratic republic"],
  ["moldova", "moldova, republic of"],
  ["iran", "iran, islamic republic of"],
  ["syria", "syrian arab republic"],
  ["tanzania", "tanzania, united republic of"],
  ["venezuela", "venezuela, bolivarian republic of"],
  ["bolivia", "bolivia, plurinational state of"],
  ["south korea", "korea, republic of"],
  ["north korea", "korea, democratic people's republic of"],
  ["vietnam", "viet nam"],
]);

function normalizeCountryName(name) {
  const base = normalizeBase(name);
  return COUNTRY_SYNONYMS.get(base) || base;
}

// US state abbreviations → full names
const US_STATE_ABBR = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

function normalizeUSStateName(name) {
  if (!name) return "";
  const trimmed = name.toString().trim();
  const abbr = trimmed.toUpperCase();
  const full = US_STATE_ABBR[abbr];
  const chosen = full || trimmed;
  return normalizeBase(chosen);
}

export default function HighlightLayer({ mode, visitedCountries, visitedStates, styleColors }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      try { layerRef.current.remove(); } catch {}
      layerRef.current = null;
    }

    if (!map || !mode || mode === "off") return;

    const fill = styleColors?.fill || "#22c55e";
    const stroke = styleColors?.stroke || "#16a34a";
    const baseStyle = {
      color: stroke,
      weight: 1,
      fillColor: fill,
      fillOpacity: 0.15,
      opacity: 0.9,
    };

    if (mode === "countries") {
      const namesSet = new Set(Array.from(visitedCountries || []).map(normalizeCountryName));
      const filtered = {
        type: "FeatureCollection",
        features: worldCountries.features.filter((f) => namesSet.has(normalizeCountryName(f.properties?.name))),
      };
      if (filtered.features.length) {
        layerRef.current = L.geoJSON(filtered, { style: baseStyle }).addTo(map);
      }
    } else if (mode === "states") {
      const namesSet = new Set(Array.from(visitedStates || []).map(normalizeUSStateName));
      const filtered = {
        type: "FeatureCollection",
        features: usStates.features.filter((f) => namesSet.has(normalizeBase(f.properties?.name))),
      };
      if (filtered.features.length) {
        layerRef.current = L.geoJSON(filtered, { style: baseStyle }).addTo(map);
      }
    }

    return () => {
      if (layerRef.current) {
        try { layerRef.current.remove(); } catch {}
        layerRef.current = null;
      }
    };
  }, [map, mode, visitedCountries, visitedStates, styleColors]);

  return null;
}
