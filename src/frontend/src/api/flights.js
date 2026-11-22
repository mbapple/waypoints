import { api } from "./client";

// Every flight leg with trip, endpoints, flight and aircraft details (oldest first)
export const listFlights = () => api.get("/flights").then(r => r.data);
