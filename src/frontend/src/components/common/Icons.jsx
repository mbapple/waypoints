import React from "react";

// Small stroke icons (24px grid, inherit currentColor). Sized by the `size` prop.
const Svg = ({ size = 16, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
    {children}
  </svg>
);

export const PinIcon = (p) => <Svg {...p}><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></Svg>;
export const BedIcon = (p) => <Svg {...p}><path d="M3 18V6" /><path d="M3 14h18v4" /><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="1.6" /></Svg>;
export const GlobeIcon = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" /></Svg>;
export const ExternalIcon = (p) => <Svg {...p}><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Svg>;
export const MoreIcon = (p) => <Svg {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Svg>;
export const PlusIcon = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const EditIcon = (p) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z" /></Svg>;
export const MapIcon = (p) => <Svg {...p}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></Svg>;
export const CameraIcon = (p) => <Svg {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>;
export const ChevronLeftIcon = (p) => <Svg {...p}><path d="M15 6l-6 6 6 6" /></Svg>;
export const ChevronRightIcon = (p) => <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>;

export const PlaneIcon = (p) => <Svg {...p}><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></Svg>;
export const CarIcon = (p) => <Svg {...p}><path d="M5 16V11l2-5h10l2 5v5" /><path d="M3 16h18v2H3z" /><circle cx="7.5" cy="13" r="0.8" /><circle cx="16.5" cy="13" r="0.8" /></Svg>;
export const TrainIcon = (p) => <Svg {...p}><rect x="6" y="3" width="12" height="13" rx="3" /><path d="M6 10h12" /><path d="M8 20l2-4M16 20l-2-4" /></Svg>;
export const BusIcon = (p) => <Svg {...p}><rect x="5" y="3" width="14" height="14" rx="2" /><path d="M5 11h14" /><path d="M8 17v3M16 17v3" /></Svg>;
export const BoatIcon = (p) => <Svg {...p}><path d="M3 17l2 3h14l2-3H3z" /><path d="M6 17V9h12v8" /><path d="M12 9V4" /></Svg>;
export const RouteIcon = (p) => <Svg {...p}><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" /></Svg>;
export const PlayIcon = (p) => <Svg {...p}><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></Svg>;
export const PauseIcon = (p) => <Svg {...p}><path d="M8 5v14M16 5v14" strokeWidth="3" /></Svg>;

export function TransportIcon({ type, ...p }) {
  switch ((type || "").toLowerCase()) {
    case "flight": return <PlaneIcon {...p} />;
    case "car": return <CarIcon {...p} />;
    case "train": return <TrainIcon {...p} />;
    case "bus": return <BusIcon {...p} />;
    case "boat": return <BoatIcon {...p} />;
    default: return <RouteIcon {...p} />;
  }
}
