from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/stops", tags=["stops"])

# Stop model for input validation
class Stop(BaseModel):
    name: str
    leg_id: int | None = None
    node_id: int | None = None
    description: str | None = None
    category: str | None = None
    notes: str | None = None

# Return a list of all stops corresponding to a specific leg
@router.get("/by_leg/{leg_id}")
def get_stops_by_leg(leg_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, leg_id, node_id, description, category, notes
        FROM stops
        WHERE leg_id = %s
        ORDER BY time_created
    """, (leg_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "id": r["id"],
            "name": r["name"],
            "leg_id": r["leg_id"],
            "node_id": r["node_id"],
            "description": r["description"],
            "category": r["category"],
            "notes": r["notes"] if r["notes"] else None
        }
        for r in rows
    ]

# Return a list of all stops corresponding to a specific node
@router.get("/by_node/{node_id}")
def get_stops_by_node(node_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, leg_id, node_id, description, category, notes
        FROM stops
        WHERE node_id = %s
        ORDER BY time_created
    """, (node_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "id": r["id"],
            "name": r["name"],
            "leg_id": r["leg_id"],
            "node_id": r["node_id"],
            "description": r["description"],
            "category": r["category"],
            "notes": r["notes"] if r["notes"] else None
        }
        for r in rows
    ]

@router.post("/")
def create_stop(stop: Stop):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO stops (name, leg_id, node_id, description, category, notes)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        stop.name,
        stop.leg_id,
        stop.node_id,
        stop.description,
        stop.category,
        stop.notes
    ))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Stop created successfully"}

@router.get("/{stop_id}")
def get_stop_by_id(stop_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, leg_id, node_id, description, category, notes
        FROM stops
        WHERE id = %s
    """, (stop_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return {
            "id": row["id"],
            "name": row["name"],
            "leg_id": row["leg_id"],
            "node_id": row["node_id"],
            "description": row["description"],
            "category": row["category"],
            "notes": row["notes"] if row["notes"] else None
        }
    else:
        raise HTTPException(status_code=404, detail="Stop not found")