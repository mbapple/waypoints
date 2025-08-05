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

## Nodes API (`/api/nodes`)

### GET `/api/nodes/by_trip/{trip_id}`
Get all nodes for a specific trip, ordered by arrival date.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Hotel Downtown",
    "description": "4-star hotel in city center",
    "trip_id": 1,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "arrival_date": "2025-07-01",
    "departure_date": "2025-07-03",
    "notes": "Check-in after 3PM"
  }
]
```

### POST `/api/nodes/`
Create a new node.

**Request Body:**
```json
{
  "name": "Node Name",
  "description": "Optional description",
  "trip_id": 1,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "arrival_date": "2025-07-01",
  "departure_date": "2025-07-03",
  "notes": "Optional notes"
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
  "name": "Hotel Downtown",
  "description": "4-star hotel in city center",
  "trip_id": 1,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "arrival_date": "2025-07-01",
  "departure_date": "2025-07-03",
  "notes": "Check-in after 3PM"
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
    "start_node_id": 1,
    "end_node_id": 2,
    "miles": 250.5,
    "notes": "Take scenic route"
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
  "start_node_id": 1,
  "end_node_id": 2,
  "date": "2025-07-02",
  "notes": "Optional notes"
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
  "start_node_id": 1,
  "end_node_id": 2,
  "miles": 250.5,
  "notes": "Take scenic route"
}
```

**Error Responses:**
- `404` - Leg not found

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
    "name": "Gas Station",
    "leg_id": 1,
    "node_id": null,
    "description": "Fuel stop",
    "category": "fuel",
    "notes": "Cheapest gas in area"
  }
]
```

### GET `/api/stops/by_node/{node_id}`
Get all stops for a specific node, ordered by creation time.

**Response:**
```json
[
  {
    "id": 2,
    "name": "Restaurant",
    "leg_id": null,
    "node_id": 1,
    "description": "Italian restaurant",
    "category": "dining",
    "notes": "Make reservation"
  }
]
```

### POST `/api/stops/`
Create a new stop.

**Request Body:**
```json
{
  "name": "Stop Name",
  "trip_id": 1,
  "leg_id": 1,
  "node_id": null,
  "description": "Optional description",
  "category": "fuel",
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "message": "Stop created successfully"
}
```

### GET `/api/stops/{stop_id}`
Get a specific stop by ID.

**Response:**
```json
{
  "id": 1,
  "name": "Gas Station",
  "leg_id": 1,
  "node_id": null,
  "description": "Fuel stop",
  "category": "fuel",
  "notes": "Cheapest gas in area"
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
  "description": "string (optional)",
  "trip_id": "integer (optional)",
  "latitude": "float (optional)",
  "longitude": "float (optional)",
  "arrival_date": "string (optional)",
  "departure_date": "string (optional)",
  "notes": "string (optional)"
}
```

### Leg
```json
{
  "trip_id": "integer (required)",
  "type": "string (required)",
  "start_node_id": "integer (required)",
  "end_node_id": "integer (required)",
  "date": "string (required)",
  "notes": "string (optional)"
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
  "notes": "string (optional)"
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
