from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2

from connect import get_db

router = APIRouter(prefix="/api/trips", tags=["trips"])

# Trip model for input validation
class Trip(BaseModel):
    name: str
    start_date: str
    end_date: str
    description: str | None = None


@router.get("/")
def get_trips():
    conn = get_db()
    print("Connection is type:", type(conn))
    cur = conn.cursor()
    cur.execute("SELECT id, name, start_date, end_date FROM trips ORDER BY start_date")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {"id": r["id"], "name": r["name"], "start_date": r["start_date"], "end_date": r["end_date"]}
        for r in rows
    ]


@router.post("/")
def create_trip(trip: Trip):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO trips (name, start_date, end_date, description) VALUES (%s, %s, %s, %s)",
        (trip.name, trip.start_date, trip.end_date, trip.description),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Trip created"}


@router.get("/{trip_id}")
def get_trip(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name, start_date, end_date, description FROM trips WHERE id = %s", (trip_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return {"id": row["id"], "name": row["name"], "start_date": row["start_date"], "end_date": row["end_date"], "description": row["description"] if len(row) > 4 else None}
    else:
        raise HTTPException(status_code=404, detail="Trip not found")
    

@router.delete("/{trip_id}")
def delete_trip(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM trips WHERE id = %s RETURNING id", (trip_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if deleted:
        return {"message": f"Trip {trip_id} deleted"}
    else:
        raise HTTPException(status_code=404, detail="Trip not found")