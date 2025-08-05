from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/legs", tags=["legs"])

# Leg model for input validation
class Leg(BaseModel):
    trip_id: int
    type: str
    start_node_id: int
    end_node_id: int
    #TODO: figure out how to add geography points
    #miles: float
    date: str
    notes: str | None = None

@router.get("/by_trip/{trip_id}")
def get_legs_by_node(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, trip_id, type, start_node_id, end_node_id, miles, notes
        FROM legs
        WHERE trip_id = %s
        ORDER BY id
    """, (trip_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "id": r["id"],
            "trip_id": r["trip_id"],
            "type": r["type"],
            "start_node_id": r["start_node_id"],
            "end_node_id": r["end_node_id"],
            "miles": r["miles"],
            "notes": r["notes"] if r["notes"] else None
        }
        for r in rows
    ]

# Create a new leg
@router.post("/")
def create_leg(leg: Leg):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO legs (trip_id, type, start_node_id, end_node_id, notes, date)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        leg.trip_id,
        leg.type,
        leg.start_node_id,
        leg.end_node_id,
        leg.notes,
        leg.date
    ))
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Leg created successfully"}

# Return a specific leg by ID
@router.get("/{leg_id}")
def get_leg_by_id(leg_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, trip_id, type, start_node_id, end_node_id, miles, notes
        FROM legs
        WHERE id = %s
    """, (leg_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Leg not found")

    return {
        "id": row["id"],
        "trip_id": row["trip_id"],
        "type": row["type"],
        "start_node_id": row["start_node_id"],
        "end_node_id": row["end_node_id"],
        "miles": row["miles"],
        "notes": row["notes"] if row["notes"] else None
    }

@router.delete("/{leg_id}")
def delete_leg(leg_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM legs
        WHERE id = %s
    """, (leg_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if deleted:
        return {"message": "Leg deleted successfully"} 
    else:
        raise HTTPException(status_code=404, detail="Leg not found")
    

