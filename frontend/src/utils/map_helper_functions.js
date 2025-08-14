import { useMap } from "react-leaflet";
import { useEffect} from "react";

export function quadraticBezierPoints(p0, p1, p2, steps = 64) {
	const pts = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const x = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
		const y = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
		pts.push([y, x]);
	}
	return pts;
}

export function curvedFlightPath(start, end, curvature = 0.2) {
	const [lat1, lng1] = start;
	const [lat2, lng2] = end;
	const midLat = (lat1 + lat2) / 2;
	const midLng = (lng1 + lng2) / 2;
	const dx = lng2 - lng1;
	const dy = lat2 - lat1;
	const len = Math.sqrt(dx * dx + dy * dy) || 1;
	const nx = -(dy / len);
	const ny = dx / len;
	const controlLat = midLat + ny * len * curvature;
	const controlLng = midLng + nx * len * curvature;
	return quadraticBezierPoints([lat1, lng1], [controlLat, controlLng], [lat2, lng2], 72);
}

export function FitToBounds({ bounds }) {
	const map = useMap();
	useEffect(() => {
		if (!bounds) return;
		try {
			map.fitBounds(bounds, { padding: [30, 30] });
		} catch {}
	}, [map, bounds]);
	return null;
}