import axios from "axios";

// Prefer environment variable, fall back to local dev
//export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001/api";
export const API_BASE_URL = "http://localhost:3001/api"
export const API_ORIGIN = API_BASE_URL.replace(/\/?api\/?$/, "");

export const api = axios.create({ baseURL: API_BASE_URL });

// Helper: round to nearest tenth
const roundTenth = (v) => Math.round(v * 10) / 10;

// Deep traversal to round any field that appears to represent miles.
// Criteria:
//  - Object property key exactly 'miles' (case-insensitive)
//  - Key ends with '_miles' (case-insensitive)
//  - Root numeric response when URL path ends with '/miles'
function roundMilesInData(data, url) {
	if (data == null) return data;

	// If root is a number and endpoint likely represents miles
	if (typeof data === 'number' && /(^|\/)miles(\/?|$)/i.test(url)) {
		return roundTenth(data);
	}

	const stack = [data];
	const seen = new Set();
	while (stack.length) {
		const current = stack.pop();
		if (!current || typeof current !== 'object') continue;
		if (seen.has(current)) continue; // guard cyclic refs
		seen.add(current);

		if (Array.isArray(current)) {
			for (let i = 0; i < current.length; i++) {
				const val = current[i];
				if (typeof val === 'object' && val !== null) {
					stack.push(val);
				} else if (typeof val === 'number' && /(^|\/)miles(\/?|$)/i.test(url)) {
					// Array of raw mile numbers from a miles endpoint
					current[i] = roundTenth(val);
				}
			}
			continue;
		}

		for (const [key, val] of Object.entries(current)) {
			if (val != null && typeof val === 'object') {
				stack.push(val);
				continue;
			}
			if (typeof val === 'number') {
				if (/^(miles|.*_miles)$/i.test(key)) {
					current[key] = roundTenth(val);
				}
			}
		}
	}
	return data;
}

// Response interceptor to apply rounding before user code consumes data
api.interceptors.response.use((response) => {
	try {
		response.data = roundMilesInData(response.data, response.config?.url || '');
	} catch (e) {
		// Fail silently; do not block response
	}
	return response;
});

// Common helpers
export const numOrNull = (v) => (v === "" || v === undefined || v === null ? null : Number(v));
export const strOrNull = (v) => (v === "" || v === undefined ? null : String(v));

export default api;
