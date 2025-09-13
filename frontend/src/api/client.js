import axios from "axios";

// Prefer environment variable, fall back to local dev
//export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001/api";
export const API_BASE_URL = "http://192.168.31.101:3001/api"
export const API_ORIGIN = API_BASE_URL.replace(/\/?api\/?$/, "");

export const api = axios.create({ baseURL: API_BASE_URL });

// Common helpers
export const numOrNull = (v) => (v === "" || v === undefined || v === null ? null : Number(v));
export const strOrNull = (v) => (v === "" || v === undefined ? null : String(v));

export default api;
