import { useMap } from "react-leaflet";
import { useEffect} from "react";

// Great-circle path between two lat/lon points (degrees) using slerp on a unit sphere.
// Accepts either a segment count (>= 2) or a legacy curvature factor (0..1) for the third arg.
export function curvedFlightPath(start, end, segmentsOrCurvature = 0.25) {
	const [lat1, lon1] = start;
	const [lat2, lon2] = end;

	// Convert degrees to radians
	const toRad = (d) => (d * Math.PI) / 180;
	const toDeg = (r) => (r * 180) / Math.PI;

	const φ1 = toRad(lat1);
	const λ1 = toRad(lon1);
	const φ2 = toRad(lat2);
	const λ2 = toRad(lon2);

	// Convert to 3D unit vectors
	const v1 = [
		Math.cos(φ1) * Math.cos(λ1),
		Math.cos(φ1) * Math.sin(λ1),
		Math.sin(φ1),
	];
	const v2 = [
		Math.cos(φ2) * Math.cos(λ2),
		Math.cos(φ2) * Math.sin(λ2),
		Math.sin(φ2),
	];

		const dot = Math.max(-1, Math.min(1, v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2]));
		let omega = Math.acos(dot); // central angle in radians

	// If points are identical or extremely close, just return the straight segment
	if (!isFinite(omega) || omega < 1e-6) {
		return [start, end];
	}

		// Determine segment count: use provided as a minimum, also scale with angular distance.
		const baseProvided = (typeof segmentsOrCurvature === "number" && segmentsOrCurvature <= 1)
			? Math.max(16, Math.round(128 * segmentsOrCurvature))
			: Math.max(16, Math.round(Number(segmentsOrCurvature) || 64));
		// ~1 point per 0.75° of arc length
		const segmentsByAngle = Math.ceil((omega * 180 / Math.PI) / 0.75);
		let segments = Math.max(baseProvided, segmentsByAngle);
		segments = Math.max(16, Math.min(256, segments));

	const sinOmega = Math.sin(omega);
	// Antipodal handling: when sinOmega ~ 0, choose an arbitrary orthogonal path
	let p = [];
	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		let A = Math.sin((1 - t) * omega) / sinOmega;
		let B = Math.sin(t * omega) / sinOmega;

		// Fallback for antipodal/near-antipodal: linearly interpolate and renormalize
		if (!isFinite(A) || !isFinite(B)) {
			A = 1 - t;
			B = t;
		}

		const x = A * v1[0] + B * v2[0];
		const y = A * v1[1] + B * v2[1];
		const z = A * v1[2] + B * v2[2];
		const norm = Math.hypot(x, y, z) || 1;
		const xn = x / norm, yn = y / norm, zn = z / norm;
		const lat = toDeg(Math.asin(zn));
		const lon = toDeg(Math.atan2(yn, xn));
		p.push([lat, lon]);
	}
	return p;
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