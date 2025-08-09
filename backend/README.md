# Backend API Documentation

This is the backend API for the trip planning application built with FastAPI and PostgreSQL.

## Base URL
All endpoints are prefixed with `/api`

## Trips API (`/api/trips`)

### GET `/api/trips/`
Get all trips ordered by start date.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Summer Vacation",
    "start_date": "2025-07-01",
    "end_date": "2025-07-15"
  }
]
```

### POST `/api/trips/`
Create a new trip.

**Request Body:**
```json
{
  "name": "Trip Name",
  "start_date": "2025-07-01",
  "end_date": "2025-07-15",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "message": "Trip created"
}
```

### GET `/api/trips/{trip_id}`
Get a specific trip by ID.

**Response:**
```json
{
  "id": 1,
  "name": "Summer Vacation",
  "start_date": "2025-07-01",
  "end_date": "2025-07-15",
  "description": "Family vacation to the mountains"
}
```

**Error Responses:**
- `404` - Trip not found

### DELETE `/api/trips/{trip_id}`
Delete a trip and all associated nodes and legs.

**Response:**
```json
{
  "message": "Trip {trip_id} and all associate legs and nodes deleted"
}
```

**Error Responses:**
- `404` - Trip not found

### GET `/api/trips/{trip_id}/all_nodes_and_legs`
Get all nodes and legs for a trip in ordered sequence.

**Response:**
```json
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
        "longitude": -74.0060,
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
        "type": "driving",
        "start_node_id": 1,
        "end_node_id": 2,
        "miles": 250.5,
        "notes": "Highway route"
      }
    }
  ]
}
```

### GET `/api/trips/{trip_id}/miles`
Get the total miles of all legs in a trip.

**Response:**
```json
{
  "total_miles": 1903
}
```

### GET `/api/statistics`
Get some statistics about all trips.

**Response:**
```json
{
  "all_trip_miles": 1903,
  "unique_destination_count": 3
}
```

## Nodes API (`/api/nodes`)

### GET `/api/nodes/by_trip/{trip_id}`
Get all nodes for a specific trip, ordered by arrival date.

**Response:**
```json
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
    "longitude": -74.0060,
    "osm_name": "Downtown Hotel, City Center, State, Country",
    "osm_id": 12345
  }
]
```

### POST `/api/nodes/`
Create a new node.

**Request Body:**
```json
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
  "osm_id": 41485
}
```

**Response:**
```json
{
  "message": "Node created"
}
```

### GET `/api/nodes/{node_id}`
Get a specific node by ID.

**Response:**
```json
{
  "id": 1,
  "trip_id": 1,
  "name": "Hotel Downtown",
  "description": "4-star hotel in city center",
  "notes": "Check-in after 3PM",
  "arrival_date": "2025-07-01",
  "departure_date": "2025-07-03",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "osm_name": "Downtown Hotel, City Center, State, Country"
}
```

**Error Responses:**
- `404` - Node not found

### DELETE `/api/nodes/{node_id}`
Delete a node by ID.

**Response:**
```json
{
  "message": "Node deleted"
}
```

**Error Responses:**
- `404` - Node not found

### PUT `/api/nodes/{node_id}`
Update an existing node. Only provided fields are updated.

**Request Body (any subset):**
```json
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
  "osm_id": "999"
}
```

**Response:**
```json
{ "message": "Node {node_id} updated" }
```

## Legs API (`/api/legs`)

### GET `/api/legs/by_trip/{trip_id}`
Get all legs for a specific trip, ordered by ID.

**Response:**
```json
[
  {
    "id": 1,
    "trip_id": 1,
    "type": "driving",
    "notes": "Take scenic route",
    "date": "2025-07-02",
    "start_node_id": 1,
    "end_node_id": 2,
    "start_latitude": 40.7128,
    "start_longitude": -74.0060,
    "end_latitude": 42.3601,
    "end_longitude": -71.0589,
    "start_osm_name": "New York, NY, USA",
    "start_osm_id": 175905,
    "end_osm_name": "Boston, MA, USA",
    "end_osm_id": 61443,
    "miles": 250.5
  }
]
```

### POST `/api/legs/`
Create a new leg.

**Request Body:**
```json
{
  "trip_id": 1,
  "type": "driving",
  "notes": "Optional notes",
  "date": "2025-07-02",
  "start_node_id": 1,
  "end_node_id": 2,
  "start_latitude": 40.7128,
  "start_longitude": -74.0060,
  "end_latitude": 42.3601,
  "end_longitude": -71.0589,
  "start_osm_name": "New York, NY, USA",
  "start_osm_id": 175905,
  "end_osm_name": "Boston, MA, USA",
  "end_osm_id": 61443,
  "miles": 250.5
}
```

**Response:**
```json
{
  "message": "Leg created successfully"
}
```

### GET `/api/legs/{leg_id}`
Get a specific leg by ID.

**Response:**
```json
{
  "id": 1,
  "trip_id": 1,
  "type": "driving",
  "notes": "Take scenic route",
  "date": "2025-07-02",
  "start_node_id": 1,
  "end_node_id": 2,
  "start_latitude": 40.7128,
  "start_longitude": -74.0060,
  "end_latitude": 42.3601,
  "end_longitude": -71.0589,
  "start_osm_name": "New York, NY, USA",
  "start_osm_id": 175905,
  "end_osm_name": "Boston, MA, USA",
  "end_osm_id": 61443,
  "miles": 250.5
}
```

**Error Responses:**
- `404` - Leg not found

### PUT `/api/legs/{leg_id}`
Update an existing leg. Only provided fields are updated.

**Request Body (any subset):**
```json
{
  "type": "car",
  "notes": "Shorter route",
  "date": "2025-07-03",
  "start_node_id": 2,
  "end_node_id": 3,
  "miles": 123.4
}
```

**Response:**
```json
{ "message": "Leg {leg_id} updated" }
```

### DELETE `/api/legs/{leg_id}`
Delete a leg by ID.

**Response:**
```json
{
  "message": "Leg deleted successfully"
}
```

**Error Responses:**
- `404` - Leg not found

## Stops API (`/api/stops`)

### GET `/api/stops/by_leg/{leg_id}`
Get all stops for a specific leg, ordered by creation time.

**Response:**
```json
[
  {
    "id": 1,
    "trip_id": 1,
    "name": "Gas Station",
    "notes": "Cheapest gas in area",
    "category": "Other",
    "leg_id": 1,
    "latitude": 81.91934,
    "longitude": -30.193093,
    "description": "Fuel stop",
    "osm_name": "Shell Station, 381 Main Street",
    "osm_id": 1901914
  }
]
```

### GET `/api/stops/by_node/{node_id}`
Get all stops for a specific node, ordered by creation time.

**Response:**
```json
[
  {
    "id": 1,
    "trip_id": 1,
    "name": "Gas Station",
    "notes": "Cheapest gas in area",
    "category": "Other",
    "node_id": 1,
    "latitude": 81.91934,
    "longitude": -30.193093,
    "description": "Fuel stop",
    "osm_name": "Shell Station, 381 Main Street",
    "osm_id": 1901914
  }
]
```

### GET `/api/stops/by_trip/{trip_id}`
Geat all stops for a specific trip, ordered by id.

**Response:**
```json
[
  {
    "id": 1,
    "trip_id": 1,
    "name": "Gas Station",
    "notes": "Cheapest gas in area",
    "category": "Other",
    "node_id": 1,
    "leg_id": null,
    "latitude": 81.91934,
    "longitude": -30.193093,
    "description": "Fuel stop",
    "osm_name": "Shell Station, 381 Main Street",
    "osm_id": 1901914
  }
]
```

### POST `/api/stops/`
Create a new stop.

**Request Body:**
```json
{
  "trip_id": 1,
  "name": "Stop Name",
  "leg_id": 1,
  "node_id": null,
  "category": "fuel",
  "notes": "Optional notes",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "osm_name": "Gas Station, Street Name, City, State",
  "osm_id": 98765
}
```

**Response:**
```json
{
  "message": "Stop created successfully"
}
```

### PUT `/api/stops/{stop_id}`
Update an existing stop. Only provided fields are updated.

**Request Body (any subset):**
```json
{
  "name": "Hotel California",
  "category": "hotel",
  "notes": "Updated notes"
}
```

**Response:**
```json
{ "message": "Stop {stop_id} updated" }
```

## Trips API (continued)

### PUT `/api/trips/{trip_id}`
Update an existing trip. Only provided fields are updated.

**Request Body (any subset):**
```json
{
  "name": "Updated Trip Name",
  "start_date": "2025-07-01",
  "end_date": "2025-07-15",
  "description": "New description"
}
```

**Response:**
```json
{ "message": "Trip {trip_id} updated" }
```

### GET `/api/stops/{stop_id}`
Get a specific stop by ID.

**Response:**
```json
{
  "id": 1,
  "trip_id": 1,
  "name": "Stop Name",
  "leg_id": 1,
  "node_id": null,
  "category": "fuel",
  "notes": "Optional notes",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "osm_name": "Gas Station, Street Name, City, State",
  "osm_id": 98765
}
```

**Error Responses:**
- `404` - Stop not found

## Data Models

### Trip
```json
{
  "name": "string (required)",
  "start_date": "string (required)",
  "end_date": "string (required)",
  "description": "string (optional)"
}
```

### Node
```json
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
  "osm_id": "integer (optional)"
}
```

### Leg
```json
{
  "trip_id": "integer (required)",
  "type": "string (required)",
  "notes": "string (optional)",
  "date": "string (required)",
  "start_node_id": "integer (required)",
  "end_node_id": "integer (required)",
  "start_latitude": "float (optional)",
  "start_longitude": "float (optional)",
  "end_latitude": "float (optional)",
  "end_longitude": "float (optional)",
  "start_osm_name": "string (optional)",
  "start_osm_id": "integer (optional)",
  "end_osm_name": "string (optional)",
  "end_osm_id": "integer (optional)",
  "miles": "float (optional)"
}
```

### Stop
```json
{
  "name": "string (required)",
  "trip_id": "integer (required)",
  "leg_id": "integer (optional)",
  "node_id": "integer (optional)",
  "description": "string (optional)",
  "category": "string (optional)",
  "notes": "string (optional)",
  "latitude": "float (optional)",
  "longitude": "float (optional)",
  "osm_name": "string (optional)",
  "osm_id": "integer (optional)"
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `404` - Resource not found
- `422` - Validation error (invalid request body)
- `500` - Internal server error

Error responses follow this format:
```json
{
  "detail": "Error message"
}
```

## Development

To run the backend:
1. Install dependencies: `pip install -r requirements.txt`
2. Start the server: `uvicorn main:app --reload`
3. Access API documentation at: `http://localhost:8000/docs`
