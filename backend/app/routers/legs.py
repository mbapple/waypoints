from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/legs", tags=["legs"])

# Leg model for input validation
class Leg(BaseModel):
    trip_id: int
    type: str
    notes: str | None = None
    date: str
    start_node_id: int
    end_node_id: int
    start_latitude: float | None = None
    start_longitude: float | None = None
    end_latitude: float | None = None
    end_longitude: float | None = None
    start_osm_name: str | None = None
    start_osm_id: str | None = None
    end_osm_name: str | None = None
    end_osm_id: str | None = None
    miles: float | None = None

# Leg update model (all fields optional)
class LegUpdate(BaseModel):
    trip_id: int | None = None
    type: str | None = None
    notes: str | None = None
    date: str | None = None
    start_node_id: int | None = None
    end_node_id: int | None = None
    start_latitude: float | None = None
    start_longitude: float | None = None
    end_latitude: float | None = None
    end_longitude: float | None = None
    start_osm_name: str | None = None
    start_osm_id: str | None = None
    end_osm_name: str | None = None
    end_osm_id: str | None = None
    miles: float | None = None

@router.get("/by_trip/{trip_id}")
def get_legs_by_node(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, trip_id, type, notes, date, start_node_id, end_node_id, start_latitude, start_longitude, end_latitude, end_longitude, start_osm_name, start_osm_id, end_osm_name, end_osm_id, miles
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
            "notes": r["notes"] if r["notes"] else None,
            "date": r["date"],
            "start_node_id": r["start_node_id"],
            "end_node_id": r["end_node_id"],
            "start_latitude": r["start_latitude"],
            "start_longitude": r["start_longitude"],
            "end_latitude": r["end_latitude"],
            "end_longitude": r["end_longitude"],
            "start_osm_name": r["start_osm_name"],
            "start_osm_id": r["start_osm_id"],
            "end_osm_name": r["end_osm_name"],
            "end_osm_id": r["end_osm_id"],
            "miles": r["miles"]
        }
        for r in rows
    ]

# Create a new leg
@router.post("/")
def create_leg(leg: Leg):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO legs (trip_id, type, notes, date, start_node_id, end_node_id, start_latitude, start_longitude, end_latitude, end_longitude, start_osm_name, start_osm_id, end_osm_name, end_osm_id, miles)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        leg.trip_id,
        leg.type,
        leg.notes,
        leg.date,
        leg.start_node_id,
        leg.end_node_id,
        leg.start_latitude,
        leg.start_longitude,
        leg.end_latitude,
        leg.end_longitude,
        leg.start_osm_name,
        leg.start_osm_id,
        leg.end_osm_name,
        leg.end_osm_id,
        leg.miles if leg.miles is not None else None
    ))
    new_row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {"message": "Leg created successfully", "id": new_row["id"]}

# Return a specific leg by ID
@router.get("/{leg_id}")
def get_leg_by_id(leg_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, trip_id, type, notes, date, start_node_id, end_node_id, start_latitude, start_longitude, end_latitude, end_longitude, start_osm_name, start_osm_id, end_osm_name, end_osm_id, miles
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
        "notes": row["notes"] if row["notes"] else None,
        "date": row["date"],
        "start_node_id": row["start_node_id"],
        "end_node_id": row["end_node_id"],
        "start_latitude": row["start_latitude"],
        "start_longitude": row["start_longitude"],
        "end_latitude": row["end_latitude"],
        "end_longitude": row["end_longitude"],
        "start_osm_name": row["start_osm_name"],
        "start_osm_id": row["start_osm_id"],
        "end_osm_name": row["end_osm_name"],
        "end_osm_id": row["end_osm_id"],
        "miles": row["miles"]
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
    

@router.put("/{leg_id}")
def update_leg(leg_id: int, update: LegUpdate):
    data = update.model_dump(exclude_unset=True) if hasattr(update, "model_dump") else update.dict(exclude_unset=True)
    allowed = {"trip_id", "type", "notes", "date", "start_node_id", "end_node_id", "start_latitude", "start_longitude", "end_latitude", "end_longitude", "start_osm_name", "start_osm_id", "end_osm_name", "end_osm_id", "miles"}
    data = {k: v for k, v in data.items() if k in allowed}
    if not data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    set_clauses = ", ".join([f"{col} = %s" for col in data.keys()])
    params = list(data.values()) + [leg_id]

    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE legs SET {set_clauses} WHERE id = %s RETURNING id", params)
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Leg not found")

    return {"message": f"Leg {leg_id} updated"}


