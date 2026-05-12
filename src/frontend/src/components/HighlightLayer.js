import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import * as topojson from "topojson-client";
import world110m from "world-atlas/countries-50m.json";
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
  ["dominican republic", "dominican rep."]
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

export default function HighlightLayer({ mode, visitedCountries, visitedStates, styleColors, onFeatureData, focusFeature }) {
  const map = useMap();
  const layerRef = useRef(null);
  const featureDataRef = useRef([]);

  // Simple HSL -> Hex converter
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

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

    featureDataRef.current = [];
    let features = [];
    if (mode === "countries") {
      const namesSet = new Set(Array.from(visitedCountries || []).map(normalizeCountryName));
      features = worldCountries.features.filter((f) => namesSet.has(normalizeCountryName(f.properties?.name)));
    } else if (mode === "states") {
      const namesSet = new Set(Array.from(visitedStates || []).map(normalizeUSStateName));
      features = usStates.features.filter((f) => namesSet.has(normalizeBase(f.properties?.name)));
    }

    if (features.length) {
      // Sort to keep color assignment stable
      features = [...features].sort((a, b) => (a.properties?.name || '').localeCompare(b.properties?.name || ''));
      const colorMap = new Map();
      features.forEach((f, idx) => {
        const hue = (idx * 137.508) % 360; // Golden angle for even distribution
        const c = hslToHex(hue, 60, 50);
        colorMap.set(f, c);
      });

      layerRef.current = L.geoJSON({ type: 'FeatureCollection', features }, {
        style: (feature) => {
          const f = features.find(ff => ff === feature); // reference equality
          const c = colorMap.get(f) || baseStyle.fillColor;
          return { ...baseStyle, color: c, fillColor: c, fillOpacity: 0.25 };
        }
      }).addTo(map);

      // Build feature data with bounds
      const temp = [];
      layerRef.current.eachLayer((lyr) => {
        try {
          if (lyr.feature) {
            const name = lyr.feature.properties?.name;
            const color = colorMap.get(lyr.feature) || baseStyle.fillColor;
            const bounds = lyr.getBounds();
            temp.push({ name, color, bounds });
          }
        } catch {}
      });
      featureDataRef.current = temp;
      if (onFeatureData) {
        // Provide serializable version (no Leaflet bounds object) plus index to reconstruct if needed
        onFeatureData(temp.map(f => ({ name: f.name, color: f.color })));
      }
    } else {
      if (onFeatureData) onFeatureData([]);
    }

    return () => {
      if (layerRef.current) {
        try { layerRef.current.remove(); } catch {}
        layerRef.current = null;
      }
    };
  }, [map, mode, visitedCountries, visitedStates, styleColors, onFeatureData]);

  // Focus on a feature when requested
  useEffect(() => {
    if (!focusFeature || !map) return;
    const target = featureDataRef.current.find(f => f.name === focusFeature);
    if (target && target.bounds) {
      try {
        map.fitBounds(target.bounds.pad(0.5), { animate: true });
      } catch {}
    }
  }, [focusFeature, map]);

  return null;
}
