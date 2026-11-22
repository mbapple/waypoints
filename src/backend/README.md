# Backend API Documentation

FastAPI + PostgreSQL backend for the trip planning application.

## Base URL
- Most endpoints are prefixed with `/api`.
- Admin database endpoints are under `/api/admin`.
- **There is no authentication** on any endpoint, including admin backup/restore. Run WayPoints only behind a VPN or an authenticating reverse proxy.

## Trips API (`/api/trips`)

### GET `/api/trips/`
Get all trips ordered by start date.

Response:
[
  {
    "id": 1,
    "name": "Summer Vacation",
    "start_date": "2025-07-01",
    "end_date": "2025-07-15"
  }
]

### POST `/api/trips/`
Create a new trip.

Request Body:
{
  "name": "Trip Name",
  "start_date": "2025-07-01",
  "end_date": "2025-07-15",
  "description": "Optional description"
}

Response:
{
  "message": "Trip created",
  "id": 123
}

### POST `/api/trips/quick`
Create a trip with all its nodes, legs and car/flight details in one transaction (used by Quick Create). Either everything is saved or nothing is. Legs refer to nodes by their position in `nodes`.

Request Body:
{
  "trip": { "name": "Paris & Rome 2026", "start_date": "2026-05-01", "end_date": "2026-05-06", "description": null },
  "nodes": [
    { "name": "London", "arrival_date": "2026-05-01", "departure_date": "2026-05-01", "latitude": 51.5, "longitude": -0.12, "osm_name": "...", "osm_id": "R65606", "osm_country": "United Kingdom", "osm_state": "England", "invisible": false },
    { "name": "Paris", ... }
  ],
  "legs": [
    {
      "start_index": 0, "end_index": 1, "type": "flight", "date": "2026-05-01", "notes": null,
      "start_latitude": 51.47, "start_longitude": -0.46, "start_osm_name": "London Heathrow Airport", ...,
      "miles": 216.4,
      "car": null,
      "flight": { "flight_number": "BA304", "airline": "British Airways", "start_airport": "LHR", "end_airport": "CDG", "polyline": null, "track_source": null }
    }
  ]
}

Node fields match `POST /api/nodes/` (without `trip_id`); leg fields match `POST /api/legs/` (without the ids). `car` is `{ "driving_time_seconds", "polyline" }`.

Response:
{ "message": "Trip created", "id": 123, "node_ids": [456, 457] }

Errors: 400 if there are fewer than two nodes, a leg's indices are out of range or equal, or a value (such as a date) is malformed; 422 for invalid fields.

### GET `/api/trips/{trip_id}`
Get a specific trip by ID.

Response:
{
  "id": 1,
  "name": "Summer Vacation",
  "start_date": "2025-07-01",
  "end_date": "2025-07-15",
  "description": "Family vacation to the mountains"
}

Errors:
- 404 - Trip not found

### PUT `/api/trips/{trip_id}`
Update an existing trip. Only provided fields are updated.

Request Body (any subset):
{
  "name": "Updated Trip Name",
  "start_date": "2025-07-01",
  "end_date": "2025-07-15",
  "description": "New description"
}

Response:
{ "message": "Trip {trip_id} updated" }

### DELETE `/api/trips/{trip_id}`
Delete a trip and all associated nodes and legs.

Response:
{ "message": "Trip {trip_id} and all associate legs and nodes deleted" }

Errors:
- 404 - Trip not found

### GET `/api/trips/{trip_id}/all_nodes_and_legs`
Get all nodes and legs for a trip in ordered sequence.

Response:
{
  "sequence": [
    {
      "type": "node",
      "data": {
        "id": 1,
        "name": "Start Location",
        "description": "Starting point",
        "trip_id": 1,
        "latitude": 40.7128,
        "longitude": -74.006,
        "arrival_date": "2025-07-01",
        "departure_date": "2025-07-02",
        "notes": "Optional notes"
      }
    },
    {
      "type": "leg",
      "data": {
        "id": 1,
        "trip_id": 1,
        "type": "car",
        "start_node_id": 1,
        "end_node_id": 2,
        "miles": 250.5,
        "notes": "Highway route"
      }
    }
  ]
}

### GET `/api/trips/{trip_id}/miles`
Get the total miles of all legs in a trip.

Response:
{ "total_miles": 1903 }

### GET `/api/trips/data/statistics`
Statistics across all trips.

Response:
{
  "all_trip_miles": 1903,
  "unique_destination_count": 3,
  "country_count": 2,
  "miles_by_type": { "car": 903, "flight": 1000, "train": 0 },
  "total_nights": 14,
  "states_by_country": { "United States": ["Illinois", "New York"], "Italy": ["Lazio"] }
}

## Destinations API (`/api/destinations`)

### GET `/api/destinations/`
Unique destinations: visible nodes grouped by `osm_id` (nodes without one are their own destination, keyed `node:<id>`). Same rule as `unique_destination_count`.

Response:
[
  { "key": "R7444", "osm_id": "R7444", "node_id": null, "name": "Paris", "osm_name": "Paris, Île-de-France, France",
    "osm_country": "France", "osm_state": "Île-de-France", "latitude": 48.85, "longitude": 2.35,
    "node_count": 2, "trips": [{ "id": 1, "name": "Europe 2024" }] }
]

### GET `/api/destinations/airports`
Both ends of every flight leg, **including invisible nodes**, deduplicated by airport code (`flight_details.start_airport` / `end_airport`), then osm_id, then node id, then coordinates.

Response:
[ { "key": "code:CDG", "code": "CDG", "name": "Paris CDG", "latitude": 49.0, "longitude": 2.55, "visit_count": 3, "trips": [{ "id": 1, "name": "Europe 2024" }] } ]

### POST `/api/destinations/merge`
Merge destinations into one place, in a single transaction. Every node whose `osm_id` is in `sources.osm_ids` (visible or not), and every node in `sources.node_ids`, gets the target's `name`, OSM fields and coordinates. Legs starting or ending at those nodes, or at those osm_ids, get the target's coordinates and OSM fields. Lists with `match_type = 'osm_id'` have the source ids replaced by the target id. Leg `miles` are not recalculated.

Request body:
{
  "sources": { "osm_ids": ["R7444", "N123"], "node_ids": [42] },
  "target": { "name": "Paris", "osm_id": "R7444", "osm_name": "Paris, Île-de-France, France",
              "osm_country": "France", "osm_state": "Île-de-France", "latitude": 48.85, "longitude": 2.35 }
}

Response:
{ "nodes_updated": 4, "legs_updated": 6, "lists_updated": 1 }

Returns 400 if nothing is selected or the only source is the target itself.

## Cities API (`/api/cities`)

Each node and stop stores the city it's in: `osm_city`, `osm_city_id`, `osm_city_lat`, `osm_city_lon`. These come from a Nominatim reverse lookup at city level (`/reverse?zoom=10`), which returns the city itself with its own OSM id and centre. Creating or updating a node or stop with coordinates, a quick-created trip, and a destination merge all schedule the lookup as a background task. Lookups are spaced about 1 per second and cached by rounded coordinates. Configure with `NOMINATIM_URL` and `NOMINATIM_LANGUAGE`.

### GET `/api/cities/`
Visited cities: visible nodes and all stops, grouped by `osm_city_id`. Airports are a separate view (`/api/destinations/airports`).

Response:
[ { "key": "R7444", "osm_city_id": "R7444", "name": "Paris", "latitude": 48.85, "longitude": 2.32, "node_count": 2, "stop_count": 5, "trips": [{ "id": 1, "name": "Europe 2024" }] } ]

### GET `/api/cities/status`
Rows with coordinates but no city yet.

Response: `{ "missing": { "nodes": 12, "stops": 40 } }`

### POST `/api/cities/backfill`
Look up the city for up to `limit` rows that lack one, starting after a cursor. Call it repeatedly with `next` until `next` is null. Rows where no city is found are reported and skipped, so a run always finishes.

Request body: `{ "table": "nodes", "after_id": 0, "limit": 5 }` (all optional; `limit` 1–20)

Response:
{
  "results": [ { "table": "nodes", "id": 3, "name": "Hotel Lutetia", "status": "found", "city": "Paris" },
               { "table": "nodes", "id": 4, "name": "Trailhead", "status": "none", "city": null } ],
  "next": { "table": "nodes", "after_id": 4 },
  "missing": { "nodes": 10, "stops": 40 }
}
`status` is `found`, `none` or `error` (with `error` text).

## Lists API (`/api/lists`): item locations

Only the location parts are described here.

### GET `/api/lists/`
Each list also has `location_count`: the number of its items that have a linked location.

### GET `/api/lists/{list_id}`
Besides `list`, `summary` and `entities`, the response has `locations`, keyed by item:
{ "locations": { "Paris": { "latitude": 48.85, "longitude": 2.35, "osm_id": "R7444", "osm_name": "Paris, Île-de-France, France", "osm_country": "France", "osm_state": "Île-de-France" } } }

### PUT `/api/lists/{list_id}/locations`
Replace every linked location for the list. Items left out are unlinked.

Request body:
{ "locations": [ { "item": "Paris", "latitude": 48.85, "longitude": 2.35, "osm_id": "R7444", "osm_name": "Paris, Île-de-France, France", "osm_country": "France", "osm_state": "Île-de-France" } ] }

Response: `{ "locations": { ... } }` (same shape as above).
Returns 404 if the list doesn't exist, and 400 if an `item` isn't on the list or coordinates are out of range. Locations are keyed by item text, so `PUT /api/lists/{list_id}` deletes the locations of items it removes or renames.

## Nodes API (`/api/nodes`)

### GET `/api/nodes/by_trip/{trip_id}`
Get all nodes for a specific trip, ordered by arrival date.

Response:
[
  {
    "id": 1,
    "trip_id": 1,
    "name": "Hotel Downtown",
    "description": "4-star hotel in city center",
    "notes": "Check-in after 3PM",
    "arrival_date": "2025-07-01",
    "departure_date": "2025-07-03",
    "latitude": 40.7128,
    "longitude": -74.006,
    "osm_name": "Downtown Hotel, City Center, State, Country",
    "osm_id": "12345",
    "osm_country": "United States",
    "osm_state": "Illinois",
    "invisible": false
  }
]

### POST `/api/nodes/`
Create a new node.

Request Body:
{
  "name": "Node Name",
  "trip_id": 1,
  "description": "Optional description",
  "notes": "Optional notes",
  "arrival_date": "2025-07-01",
  "departure_date": "2025-07-03",
  "latitude": 41.8933203,
  "longitude": 12.4829321,
  "osm_name": "Rome, Roma Capitale, Lazio, Italy",
  "osm_id": "41485",
  "osm_country": "Italy",
  "osm_state": "Lazio",
  "invisible": false
}

Response:
{ "message": "Node created", "id": 1 }

### GET `/api/nodes/{node_id}`
Get a specific node by ID.

Response:
{
  "id": 1,
  "trip_id": 1,
  "name": "Hotel Downtown",
  "description": "4-star hotel in city center",
  "notes": "Check-in after 3PM",
  "arrival_date": "2025-07-01",
  "departure_date": "2025-07-03",
  "latitude": 40.7128,
  "longitude": -74.006,
  "osm_name": "Downtown Hotel, City Center, State, Country",
  "osm_country": "United States",
  "osm_state": "Illinois",
  "invisible": false
}

Errors:
- 404 - Node not found

### PUT `/api/nodes/{node_id}`
Update an existing node. Only provided fields are updated.

Request Body (any subset):
{
  "name": "New Node Name",
  "trip_id": 1,
  "description": "Updated description",
  "notes": "Updated notes",
  "arrival_date": "2025-07-02",
  "departure_date": "2025-07-04",
  "latitude": 41.0,
  "longitude": -73.9,
  "osm_name": "Some Place",
  "osm_id": "999",
  "osm_country": "United States",
  "osm_state": "Illinois",
  "invisible": true
}

Response:
{ "message": "Node {node_id} updated" }

### DELETE `/api/nodes/{node_id}`
Delete a node by ID.

Response:
{ "message": "Node deleted" }

Errors:
- 404 - Node not found

## Legs API (`/api/legs`)

### GET `/api/legs/by_trip/{trip_id}`
Get all legs for a specific trip, ordered by ID.

Response:
[
  {
    "id": 1,
    "trip_id": 1,
    "type": "car",
    "notes": "Take scenic route",
    "date": "2025-07-02",
    "start_node_id": 1,
    "end_node_id": 2,
    "start_latitude": 40.7128,
    "start_longitude": -74.006,
    "end_latitude": 42.3601,
    "end_longitude": -71.0589,
    "start_osm_name": "New York, NY, USA",
    "start_osm_id": "175905",
    "start_osm_country": "United States",
    "start_osm_state": "New York",
    "end_osm_name": "Boston, MA, USA",
    "end_osm_id": "61443",
    "end_osm_country": "United States",
    "end_osm_state": "Massachusetts",
    "miles": 250.5
  }
]

### POST `/api/legs/`
Create a new leg.

Request Body:
{
  "trip_id": 1,
  "type": "car", // allowed: flight, car, train, bus, boat, other
  "notes": "Optional notes",
  "date": "2025-07-02",
  "start_node_id": 1,
  "end_node_id": 2,
  "start_latitude": 40.7128,
  "start_longitude": -74.006,
  "end_latitude": 42.3601,
  "end_longitude": -71.0589,
  "start_osm_name": "New York, NY, USA",
  "start_osm_id": "175905",
  "start_osm_country": "United States",
  "start_osm_state": "New York",
  "end_osm_name": "Boston, MA, USA",
  "end_osm_id": "61443",
  "end_osm_country": "United States",
  "end_osm_state": "Massachusetts",
  "miles": 250.5
}

Response:
{ "message": "Leg created successfully", "id": 1 }

### GET `/api/legs/{leg_id}`
Get a specific leg by ID.

Response:
{
  "id": 1,
  "trip_id": 1,
  "type": "car",
  "notes": "Take scenic route",
  "date": "2025-07-02",
  "start_node_id": 1,
  "end_node_id": 2,
  "start_latitude": 40.7128,
  "start_longitude": -74.006,
  "end_latitude": 42.3601,
  "end_longitude": -71.0589,
  "start_osm_name": "New York, NY, USA",
  "start_osm_id": "175905",
  "start_osm_country": "United States",
  "start_osm_state": "New York",
  "end_osm_name": "Boston, MA, USA",
  "end_osm_id": "61443",
  "end_osm_country": "United States",
  "end_osm_state": "Massachusetts",
  "miles": 250.5
}

Errors:
- 404 - Leg not found

### PUT `/api/legs/{leg_id}`
Update an existing leg. Only provided fields are updated.

Request Body (any subset):
{
  "type": "car",
  "notes": "Shorter route",
  "date": "2025-07-03",
  "start_node_id": 2,
  "end_node_id": 3,
  "miles": 123.4
}

Response:
{ "message": "Leg {leg_id} updated" }

### DELETE `/api/legs/{leg_id}`
Delete a leg by ID.

Response:
{ "message": "Leg deleted successfully" }

Errors:
- 404 - Leg not found

## Stops API (`/api/stops`)

### GET `/api/stops/by_leg/{leg_id}`
Get all stops for a specific leg.

Response:
[
  {
    "id": 1,
    "trip_id": 1,
    "name": "Gas Station",
    "notes": "Cheapest gas in area",
    "category": "other",
    "leg_id": 1,
    "latitude": 81.91934,
    "longitude": -30.193093,
    "osm_name": "Shell Station, 381 Main Street",
    "osm_id": "1901914",
    "osm_country": "United States",
    "osm_state": "Illinois"
  }
]

### GET `/api/stops/by_node/{node_id}`
Get all stops for a specific node.

Response:
[
  {
    "id": 1,
    "trip_id": 1,
    "name": "Gas Station",
    "notes": "Cheapest gas in area",
    "category": "other",
    "node_id": 1,
    "latitude": 81.91934,
    "longitude": -30.193093,
    "osm_name": "Shell Station, 381 Main Street",
    "osm_id": "1901914",
    "osm_country": "United States",
    "osm_state": "Illinois"
  }
]

### GET `/api/stops/by_trip/{trip_id}`
Get all stops for a specific trip.

Response:
[
  {
    "id": 1,
    "trip_id": 1,
    "name": "Gas Station",
    "notes": "Cheapest gas in area",
    "category": "other",
    "node_id": 1,
    "leg_id": null,
    "latitude": 81.91934,
    "longitude": -30.193093,
    "osm_name": "Shell Station, 381 Main Street",
    "osm_id": "1901914",
    "osm_country": "United States",
    "osm_state": "Illinois"
  }
]

### POST `/api/stops/`
Create a new stop.

Request Body:
{
  "trip_id": 1,
  "name": "Stop Name",
  "leg_id": 1,
  "node_id": null,
  "category": "hotel", // allowed: hotel, restaurant, attraction, park, other
  "notes": "Optional notes",
  "latitude": 40.7128,
  "longitude": -74.006,
  "osm_name": "Hotel, Street, City",
  "osm_id": "98765",
  "osm_country": "United States",
  "osm_state": "Illinois"
}

Response:
{ "message": "Stop created successfully" }

### GET `/api/stops/{stop_id}`
Get a specific stop by ID.

Response:
{
  "id": 1,
  "trip_id": 1,
  "name": "Stop Name",
  "leg_id": 1,
  "node_id": null,
  "category": "hotel",
  "notes": "Optional notes",
  "latitude": 40.7128,
  "longitude": -74.006,
  "osm_name": "Hotel, Street, City",
  "osm_id": "98765",
  "osm_country": "United States",
  "osm_state": "Illinois"
}

Errors:
- 404 - Stop not found

### PUT `/api/stops/{stop_id}`
Update an existing stop. Only provided fields are updated.

Request Body (any subset):
{
  "name": "Hotel California",
  "category": "hotel",
  "notes": "Updated notes"
}

Response:
{ "message": "Stop {stop_id} updated" }

### DELETE `/api/stops/{stop_id}`
Delete a stop by ID.

Response:
{ "message": "Stop deleted successfully" }

Errors:
- 404 - Stop not found

## Photos API (`/api/photos`)

### POST `/api/photos/upload`
Upload a photo (multipart/form-data). At least one of trip_id, leg_id, node_id, stop_id, adventure_id is required. For JPEGs the capture time is read from EXIF into `taken_at`.

Form fields: file (binary), trip_id?, leg_id?, node_id?, stop_id?, adventure_id?, description?

Response:
{ "id": 1, "url": "/uploads/xxxx.jpg" }

### GET `/api/photos/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD`
One random trip or adventure photo per day in the range (inclusive, at most 120 days), used by the calendar's month view. A photo's day is its capture date (`taken_at`); photos without one fall back to the date of their stop, node or leg, or to their trip's or adventure's date when that is a single day.

Before answering, it backfills `taken_at` for up to 200 photos of trips/adventures overlapping the range: EXIF for uploads, the asset's local capture time for Immich photos.

Response:
[
  { "date": "2026-05-03", "id": 12, "url": "/uploads/xxxx.jpg", "thumbnail_url": "/uploads/xxxx.jpg",
    "description": null, "trip_id": 3, "trip_name": "Japan", "adventure_id": null, "adventure_name": null,
    "day_count": 7 }
]

`thumbnail_url` is the Immich thumbnail proxy for Immich photos. `day_count` is how many photos that day has.

### GET `/api/photos/by_trip/{trip_id}`
List photos linked to a trip.

### GET `/api/photos/by_leg/{leg_id}`
List photos linked to a leg.

### GET `/api/photos/by_node/{node_id}`
List photos linked to a node.

### GET `/api/photos/by_stop/{stop_id}`
List photos linked to a stop.

### DELETE `/api/photos/{photo_id}`
Delete a photo and remove the file if present. For a photo linked from Immich this only removes the link; the photo stays in Immich.

## Flight Details API (`/api/flight_details`)

### GET `/api/flight_details/{leg_id}`
Get flight details for a leg.

Response:
{
  "leg_id": 7, "flight_number": "BA117", "airline": "British Airways", "start_airport": "LHR", "end_airport": "JFK",
  "polyline": "<encoded polyline>" | null, "track_source": "opensky" | null,
  "aircraft_icao24": "4007f9", "aircraft_registration": "G-YMMN", "aircraft_type": "Boeing 777 236ER", "aircraft_icao_type": "B772",
  "aircraft_photo": "/uploads/aircraft/G-YMMN.jpg", "aircraft_photo_credit": "Chris Hall", "aircraft_photo_link": "https://airport-data.com/aircraft/photo/..."
}

`polyline` is the recorded flight track in Google encoded-polyline format (1e5 precision), as for car legs. When it is null the map draws the great-circle route. The `aircraft_*` fields come from the aircraft lookup below; any of them may be null.

### POST `/api/flight_details/`
Create or replace flight details for a leg: every field above, with `leg_id`. Fields left out are set to null.

### PUT `/api/flight_details/{leg_id}`
Update flight details for a leg.

### DELETE `/api/flight_details/{leg_id}`
Delete flight details for a leg.

## Car Details API (`/api/car_details`)

### GET `/api/car_details/{leg_id}`
Get car details for a leg.

### POST `/api/car_details/`
Create or upsert car details for a leg.

### PUT `/api/car_details/{leg_id}`
Update car details for a leg.

### DELETE `/api/car_details/{leg_id}`
Delete car details for a leg.

## Admin API (`/api/admin`)

These endpoints are **unauthenticated**. Restore runs `pg_restore`/`psql` against the live database, so an uploaded `.sql` file can execute arbitrary SQL. Do not expose WayPoints to untrusted networks.

- POST `/api/admin/db/backup` – Create a backup (.dump) into the backups directory.
- GET `/api/admin/db/backups` – List backups.
- GET `/api/admin/db/backups/{filename}` – Download a backup.
- POST `/api/admin/db/restore` – Restore from an uploaded file or an existing filename.

## Integrations API (`/api/integrations`)

Server-side proxies for third-party APIs, so API keys stay in `.env` and never reach the browser.

### GET `/api/integrations/status`
Which integrations are configured (keys are never returned).

Response:
{ "ors_configured": true, "immich_configured": false, "opensky_configured": false }

### POST `/api/integrations/ors/route`
Driving route between two points via OpenRouteService (requires `ORS_API_KEY`).

Request Body:
{
  "start": { "lat": 40.7, "lon": -74.0 },
  "end": { "lat": 39.95, "lon": -75.16 }
}

Response:
{
  "duration_seconds": 5400,
  "distance_miles": 94.6,
  "coordinates": [[-74.0, 40.7], ...]
}

Errors: 503 if `ORS_API_KEY` is not set; 502 if OpenRouteService fails or is unreachable.

## OpenSky API (`/api/integrations/opensky`)

### GET `/api/integrations/opensky/route?flight_number=BA117`
The scheduled route for a flight number, from adsbdb (no key; works without OpenSky credentials). This is the route the number flies today, which is usually but not always what it flew in the past. Used to autofill a flight leg's airline and airports.

Response:
{
  "callsign": "BAW117",
  "airline": { "name": "British Airways", "iata": "BA", "icao": "BAW" } | null,
  "origin": { "iata": "LHR", "icao": "EGLL", "name": "London Heathrow Airport", "latitude": 51.47, "longitude": -0.46, "municipality": "London", "country": "United Kingdom" },
  "destination": { ... }
}

Errors: 400 for an unrecognisable flight number; 404 if adsbdb doesn't know the flight.

### POST `/api/integrations/opensky/flight-track`
The path a flight actually flew, from the OpenSky Network (requires `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET`). The flight number is turned into its ICAO radio callsign (`BA117` → `BAW117`) with adsbdb. The airports come from the request (IATA or ICAO codes; IATA is converted with hexdb.io) or else from adsbdb's current route for that flight number. OpenSky's departures (then arrivals) for that airport around the date give the aircraft, and `/tracks/all` gives its track. Nothing is saved: store `coordinates` on the leg's flight details.

Request Body:
{ "flight_number": "BA117", "date": "2026-11-20", "start_airport": "LHR", "end_airport": "JFK" }

`date` is the local departure date. `start_airport` and `end_airport` are optional.

Response:
{
  "source": "opensky",
  "callsign": "BAW117",
  "icao24": "4007f9",
  "departure_airport": "EGLL",
  "arrival_airport": "KJFK",
  "first_seen": 1763640000,
  "last_seen": 1763668800,
  "route": { "origin": { "iata": "LHR", "icao": "EGLL", "name": "...", "latitude": 51.47, "longitude": -0.46 }, "destination": { ... } } | null,
  "aircraft": { same as GET /api/integrations/aircraft } | null,
  "coordinates": [[-0.46, 51.47], ...]
}

`aircraft` is the airframe that flew it, looked up from `icao24`. If adsbdb and hexdb don't know it, only `icao24` is filled in (the other fields are null) so it can still be saved; lookup failures are logged and never lose the track. If the photo can't be saved (for example, `uploads/` isn't writable), `photo` is null and the reason is logged.

Errors: 503 if OpenSky is not configured; 400 for an unrecognisable flight number; 409 if the date is today or later (OpenSky publishes flights in a nightly batch); 410 if the date is more than ~30 days ago (OpenSky no longer has the track); 422 if no airport can be determined; 404 if no matching flight or track is found; 429 if the OpenSky daily credit limit is used up; 502 if OpenSky fails or rejects the credentials.

## Aircraft API (`/api/integrations/aircraft`)

### GET `/api/integrations/aircraft?registration=G-YMMN` (or `?icao24=4007f9`)
An aircraft's registration, type and photo. Details come from adsbdb (then hexdb.io for an `icao24`); no key is needed. A photo from airport-data.com is downloaded the first time a registration is looked up and saved as `uploads/aircraft/<REG>.jpg` with its credit in `<REG>.json`; later lookups reuse it. Photos remain their photographers' copyright: always show `credit` and `link`.

Response:
{
  "icao24": "4007f9", "registration": "G-YMMN", "type": "Boeing 777 236ER", "icao_type": "B772", "operator": "British Airways",
  "photo": { "url": "/uploads/aircraft/G-YMMN.jpg", "credit": "Chris Hall", "link": "https://airport-data.com/aircraft/photo/001861621" } | null
}

Errors: 400 if neither a valid registration nor a 6-character hex code is given; 404 if the aircraft is unknown.

## Flights API (`/api/flights`)

### GET `/api/flights`
Every flight leg, oldest first, for the Flight Data page: `leg_id`, `trip_id`, `trip_name`, `date`, `miles`, start/end coordinates (the leg's own, else its nodes'), `start_name`/`end_name` (node names), and every flight details field above.

## Immich API (`/api/integrations/immich`)

Links photos from a self-hosted Immich library (requires `IMMICH_URL` and `IMMICH_API_KEY`). The backend makes every Immich request; the browser only calls these endpoints. Linked photos are not copied: they're stored in `photos` with `immich_asset_id` set and a `url` pointing at the image proxy below.

### GET `/api/integrations/immich/trips/{trip_id}/assets`
Immich images whose local capture date falls within the trip's start and end dates (or the itinerary's dates if the trip has none). Sorted by capture time and capped at 5000.

Response:
{
  "start_date": "2026-05-01",
  "end_date": "2026-05-09",
  "truncated": false,
  "assets": [
    {
      "id": "<immich asset uuid>",
      "taken_at": "2026-05-02T10:14:03",   // local time
      "date": "2026-05-02",
      "latitude": 38.73, "longitude": -109.59,   // null without GPS
      "city": "Moab", "state": "Utah", "country": "United States",
      "filename": "IMG_1234.HEIC",
      "linked": false,                     // already linked to this trip
      "thumbnail_url": "/api/integrations/immich/assets/<id>/thumbnail",
      "preview_url": "/api/integrations/immich/assets/<id>/preview"
    }
  ]
}

### GET `/api/integrations/immich/adventures/{adventure_id}/assets`
Same as above for an adventure's `start_date`..`end_date` (`end_date` defaults to `start_date`). 400 if the adventure has no dates. `linked` means already linked to this adventure.

### GET `/api/integrations/immich/assets/{asset_id}/{size}`
Image proxy. `size` is `thumbnail` (small) or `preview` (large JPEG/WebP).

### POST `/api/integrations/immich/link`
Link an Immich image to a trip (optionally one of its nodes, legs or stops) or to an adventure. Give exactly one of `trip_id` / `adventure_id`.

Request Body:
{ "asset_id": "<uuid>", "trip_id": 1, "node_id": 3, "leg_id": null, "stop_id": null, "description": null }
or
{ "asset_id": "<uuid>", "adventure_id": 4 }

Response:
{ "id": 12, "url": "/api/integrations/immich/assets/<uuid>/preview", "immich_asset_id": "<uuid>" }

Errors: 503 if Immich is not configured; 502 if Immich is unreachable or rejects the key; 404 if the asset, trip or adventure doesn't exist; 400 if both or neither of trip_id/adventure_id are given, more than one target is given, a target is given for an adventure, or the target belongs to another trip; 409 if the photo is already linked to that trip or adventure.

## Data Models (summaries)

### Trip
{
  "name": "string (required)",
  "start_date": "string (required)",
  "end_date": "string (required)",
  "description": "string (optional)"
}

### Node
{
  "name": "string (required)",
  "trip_id": "integer (optional)",
  "description": "string (optional)",
  "notes": "string (optional)",
  "arrival_date": "string (optional)",
  "departure_date": "string (optional)",
  "latitude": "float (optional)",
  "longitude": "float (optional)",
  "osm_name": "string (optional)",
  "osm_id": "string (optional)",
  "osm_country": "string (optional)",
  "osm_state": "string (optional)",
  "invisible": "boolean (optional)"
}

### Leg
{
  "trip_id": "integer (required)",
  "type": "string (required, one of flight, car, train, bus, boat, other)",
  "notes": "string (optional)",
  "date": "string (required)",
  "start_node_id": "integer (required)",
  "end_node_id": "integer (required)",
  "start_latitude": "float (optional)",
  "start_longitude": "float (optional)",
  "end_latitude": "float (optional)",
  "end_longitude": "float (optional)",
  "start_osm_name": "string (optional)",
  "start_osm_id": "string (optional)",
  "start_osm_country": "string (optional)",
  "start_osm_state": "string (optional)",
  "end_osm_name": "string (optional)",
  "end_osm_id": "string (optional)",
  "end_osm_country": "string (optional)",
  "end_osm_state": "string (optional)",
  "miles": "float (optional)"
}

### Stop
{
  "name": "string (required)",
  "trip_id": "integer (required)",
  "leg_id": "integer (optional)",
  "node_id": "integer (optional)",
  "category": "string (optional, one of hotel, restaurant, attraction, park, other)",
  "notes": "string (optional)",
  "latitude": "float (optional)",
  "longitude": "float (optional)",
  "osm_name": "string (optional)",
  "osm_id": "string (optional)",
  "osm_country": "string (optional)",
  "osm_state": "string (optional)"
}

## Error Handling

All endpoints return appropriate HTTP status codes:
- 200 - Success
- 404 - Resource not found
- 422 - Validation error (invalid request body)
- 500 - Internal server error

Error responses follow this format:
{ "detail": "Error message" }

## Development

The backend normally runs in Docker via the root `docker-compose.yml` (see the main README). `app/start.sh` waits for the database, runs `alembic upgrade head`, then starts uvicorn on port 3001.

Configuration is read from environment variables in `app/config.py` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `ALLOWED_ORIGINS`, `UPLOAD_DIR`, `BACKUP_DIR`, `ORS_API_KEY`). Compose fills these from the root `.env`.

To run it outside Docker:
1. Install dependencies: `pip install -r app/requirements.txt`
2. Export `DB_HOST`, `DB_USER`, `DB_PASS` (and optionally `UPLOAD_DIR`/`BACKUP_DIR` to writable paths)
3. Run migrations from `src/backend`: `alembic upgrade head`
4. Start the server from `src/backend/app`: `uvicorn main:app --reload --port 3001`
5. API docs: `http://localhost:3001/docs`
