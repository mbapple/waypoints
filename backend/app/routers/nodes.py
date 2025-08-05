from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/nodes", tags=["nodes"])

# Node model for input validation
class Node(BaseModel):
    name: str
    description: str | None = None
    trip_id: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    arrival_date: str | None = None
    departure_date: str | None = None
    notes: str | None = None

# Return a list of all nodes corresponding to a specific trip
@router.get("/by_trip/{trip_id}")
def get_nodes_by_trip(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, description, trip_id, latitude, longitude, arrival_date, departure_date, notes
        FROM nodes
        WHERE trip_id = %s
        ORDER BY arrival_date
    """, (trip_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "id": r["id"],
            "name": r["name"],
            "description": r["description"],
            "trip_id": r["trip_id"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "arrival_date": r["arrival_date"],
            "departure_date": r["departure_date"],
            "notes": r["notes"] if r["notes"] else None
        }
        for r in rows
    ]

# Create a new node
@router.post("/")
def create_node(node: Node):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO nodes (name, description, trip_id, latitude, longitude, arrival_date, departure_date, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        node.name,
        node.description,
        node.trip_id,
        node.latitude,
        node.longitude,
        node.arrival_date,
        node.departure_date,
        node.notes
    ))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Node created"}

# Return a specific single node
@router.get("/{node_id}")
def get_node(node_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, description, trip_id, latitude, longitude, arrival_date, departure_date, notes
        FROM nodes
        WHERE id = %s
    """, (node_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "trip_id": row["trip_id"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "arrival_date": row["arrival_date"],
            "departure_date": row["departure_date"],
            "notes": row["notes"] if row["notes"] else None
        }
    else:
        raise HTTPException(status_code=404, detail="Node not found")
    

@router.delete("/{node_id}")
def delete_node(node_id: int):  
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM nodes WHERE id = %s RETURNING id", (node_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if deleted:
        return {"message": "Node deleted"}
    else:
        raise HTTPException(status_code=404, detail="Node not found")