from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/stops", tags=["stops"])

# Stop model for input validation
class Stop(BaseModel):
    name: str
    trip_id: int
    leg_id: int | None = None
    node_id: int | None = None
    description: str | None = None
    category: str | None = None
    notes: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    osm_name: str | None = None
    osm_id: str | None = None
    osm_country: str | None = None
    osm_state: str | None = None

# Stop update model (all fields optional)
class StopUpdate(BaseModel):
    name: str | None = None
    trip_id: int | None = None
    leg_id: int | None = None
    node_id: int | None = None
    description: str | None = None
    category: str | None = None
    notes: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    osm_name: str | None = None
    osm_id: str | None = None
    osm_country: str | None = None
    osm_state: str | None = None

# Return a list of all stops corresponding to a specific leg
@router.get("/by_leg/{leg_id}")
def get_stops_by_leg(leg_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    SELECT id, trip_id, name, notes, category, leg_id, start_date, end_date, latitude, longitude, osm_name, osm_id, osm_country, osm_state
        FROM stops
        WHERE leg_id = %s
    ORDER BY start_date ASC NULLS LAST, updated_at ASC NULLS LAST
    """, (leg_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "id": r["id"],
            "trip_id": r["trip_id"],
            "name": r["name"],
            "notes": r["notes"] if r["notes"] else None,
            "category": r["category"],
            "leg_id": r["leg_id"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "osm_name": r["osm_name"],
            "osm_id": r["osm_id"],
            "osm_country": r["osm_country"],
            "osm_state": r["osm_state"]
        }
        for r in rows
    ]

# Return a list of all stops corresponding to a specific node
@router.get("/by_node/{node_id}")
def get_stops_by_node(node_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    SELECT id, trip_id, name, notes, category, node_id, start_date, end_date, latitude, longitude, osm_name, osm_id, osm_country, osm_state
        FROM stops
        WHERE node_id = %s
    ORDER BY start_date ASC NULLS LAST, updated_at ASC NULLS LAST
    """, (node_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "id": r["id"],
            "trip_id": r["trip_id"],
            "name": r["name"],
            "notes": r["notes"] if r["notes"] else None,
            "category": r["category"],
            "node_id": r["node_id"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "osm_name": r["osm_name"],
            "osm_id": r["osm_id"],
            "osm_country": r["osm_country"],
            "osm_state": r["osm_state"]
        }
        for r in rows
    ]

# Return a list of all stops corresponding to a specific node
@router.get("/by_trip/{trip_id}")
def get_stops_by_node(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    SELECT id, trip_id, name, notes, category, node_id, leg_id, start_date, end_date, latitude, longitude, osm_name, osm_id, osm_country, osm_state
        FROM stops
        WHERE trip_id = %s
    ORDER BY start_date ASC NULLS LAST, updated_at ASC NULLS LAST
    """, (trip_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "id": r["id"],
            "trip_id": r["trip_id"],
            "name": r["name"],
            "notes": r["notes"] if r["notes"] else None,
            "category": r["category"],
            "node_id": r["node_id"],
            "leg_id": r["leg_id"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "osm_name": r["osm_name"],
            "osm_id": r["osm_id"],
            "osm_country": r["osm_country"],
            "osm_state": r["osm_state"]
        }
        for r in rows
    ]

@router.post("/")
def create_stop(stop: Stop):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    INSERT INTO stops (trip_id, name, leg_id, node_id, category, notes, start_date, end_date, latitude, longitude, osm_name, osm_id, osm_country, osm_state)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        stop.trip_id,
        stop.name,
        stop.leg_id,
        stop.node_id,
        stop.category,
        stop.notes,
    stop.start_date,
    stop.end_date,
        stop.latitude,
        stop.longitude,
        stop.osm_name,
        stop.osm_id,
        stop.osm_country,
        stop.osm_state
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
    SELECT id, trip_id, name, notes, category, leg_id, node_id, start_date, end_date, latitude, longitude, osm_name, osm_id, osm_country, osm_state
        FROM stops
        WHERE id = %s
    """, (stop_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return {
            "id": row["id"],
            "trip_id": row["trip_id"],
            "name": row["name"],
            "notes": row["notes"] if row["notes"] else None,
            "category": row["category"],
            "leg_id": row["leg_id"],
            "node_id": row["node_id"],
            "start_date": row["start_date"],
            "end_date": row["end_date"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "osm_name": row["osm_name"],
            "osm_id": row["osm_id"],
            "osm_country": row["osm_country"],
            "osm_state": row["osm_state"]
        }
    else:
        raise HTTPException(status_code=404, detail="Stop not found")


@router.put("/{stop_id}")
def update_stop(stop_id: int, update: StopUpdate):
    data = update.model_dump(exclude_unset=True) if hasattr(update, "model_dump") else update.dict(exclude_unset=True)
    allowed = {"name", "trip_id", "leg_id", "node_id", "category", "notes", "start_date", "end_date", "latitude", "longitude", "osm_name", "osm_id", "osm_country", "osm_state"}
    data = {k: v for k, v in data.items() if k in allowed}
    if not data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    set_clauses = ", ".join([f"{col} = %s" for col in data.keys()])
    params = list(data.values()) + [stop_id]

    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE stops SET {set_clauses} WHERE id = %s RETURNING id", params)
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Stop not found")

    return {"message": f"Stop {stop_id} updated"}

@router.delete("/{stop_id}")
def delete_stop(stop_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM stops
        WHERE id = %s
        RETURNING id
    """, (stop_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if deleted:
        return {"message": "Stop deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Stop not found")