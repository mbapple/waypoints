# Backend API Documentation

FastAPI + PostgreSQL backend for the trip planning application.

## Base URL
- Most endpoints are prefixed with `/api`.
- Admin database endpoints are under `/admin` and require an `X-Admin-Token` header.

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
Upload a photo (multipart/form-data). At least one of trip_id, leg_id, node_id, stop_id is required.

Form fields: file (binary), trip_id?, leg_id?, node_id?, stop_id?, description?

Response:
{ "id": 1, "url": "/uploads/xxxx.jpg" }

### GET `/api/photos/by_trip/{trip_id}`
List photos linked to a trip.

### GET `/api/photos/by_leg/{leg_id}`
List photos linked to a leg.

### GET `/api/photos/by_node/{node_id}`
List photos linked to a node.

### GET `/api/photos/by_stop/{stop_id}`
List photos linked to a stop.

### DELETE `/api/photos/{photo_id}`
Delete a photo and remove the file if present.

## Flight Details API (`/api/flight_details`)

### GET `/api/flight_details/{leg_id}`
Get flight details for a leg.

### POST `/api/flight_details/`
Create or upsert flight details for a leg.

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

## Admin API (`/admin`)

All endpoints require header: `X-Admin-Token: <token>`

- POST `/admin/db/backup` – Create a backup (.dump) into the backups directory.
- GET `/admin/db/backups` – List backups.
- GET `/admin/db/backups/{filename}` – Download a backup.
- POST `/admin/db/restore` – Restore from an uploaded file or an existing filename.

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

To run the backend:
1. Install dependencies: `pip install -r requirements.txt`
2. Start the server: `uvicorn main:app --reload`
3. API docs: `http://localhost:8000/docs`
