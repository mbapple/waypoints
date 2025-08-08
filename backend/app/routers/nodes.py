from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/nodes", tags=["nodes"])

# Node model for input validation
class Node(BaseModel):
    name: str
    trip_id: int | None = None
    description: str | None = None
    notes: str | None = None
    arrival_date: str | None = None
    departure_date: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    osm_name: str | None = None
    osm_id: str | None = None

# Node update model (all fields optional)
class NodeUpdate(BaseModel):
    name: str | None = None
    trip_id: int | None = None
    description: str | None = None
    notes: str | None = None
    arrival_date: str | None = None
    departure_date: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    osm_name: str | None = None
    osm_id: str | None = None

# Return a list of all nodes corresponding to a specific trip
@router.get("/by_trip/{trip_id}")
def get_nodes_by_trip(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, trip_id, name, description, notes, arrival_date, departure_date, latitude, longitude, osm_name,osm_id
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
            "trip_id": r["trip_id"],
            "name": r["name"],
            "description": r["description"],
            "notes": r["notes"] if r["notes"] else None,
            "arrival_date": r["arrival_date"],
            "departure_date": r["departure_date"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "osm_name": r["osm_name"] if r["osm_name"] else None,
            "osm_id": r["osm_id"] if r["osm_id"] else None
        }
        for r in rows
    ]

# Create a new node
@router.post("/")
def create_node(node: Node):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO nodes (trip_id, name, description, notes, arrival_date, departure_date, latitude, longitude, osm_name, osm_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        node.trip_id,
        node.name,
        node.description,
        node.notes,
        node.arrival_date,
        node.departure_date,
        node.latitude,
        node.longitude,
        node.osm_name,
        node.osm_id
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
        SELECT id, trip_id, name, description, notes, arrival_date, departure_date, latitude, longitude, osm_name, osm_id
        FROM nodes
        WHERE id = %s
    """, (node_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return {
            "id": row["id"],
            "trip_id": row["trip_id"],
            "name": row["name"],
            "description": row["description"],
            "notes": row["notes"] if row["notes"] else None,
            "arrival_date": row["arrival_date"],
            "departure_date": row["departure_date"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "osm_name": row["osm_name"] if row["osm_name"] else None,
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


@router.put("/{node_id}")
def update_node(node_id: int, update: NodeUpdate):
    data = update.model_dump(exclude_unset=True) if hasattr(update, "model_dump") else update.dict(exclude_unset=True)
    allowed = {"name", "trip_id", "description", "notes", "arrival_date", "departure_date", "latitude", "longitude", "osm_name", "osm_id"}
    data = {k: v for k, v in data.items() if k in allowed}
    if not data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    set_clauses = ", ".join([f"{col} = %s" for col in data.keys()])
    params = list(data.values()) + [node_id]

    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE nodes SET {set_clauses} WHERE id = %s RETURNING id", params)
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Node not found")

    return {"message": f"Node {node_id} updated"}