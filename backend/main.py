# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import os

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # React dev server TODO: fix this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection config (via env vars for Docker)
DB_NAME = os.getenv("DB_NAME", "travel_database")
DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_HOST = os.getenv("DB_HOST", "172.17.0.1")


# Trip model for input validation
class Trip(BaseModel):
    name: str
    start_date: str
    end_date: str


@app.get("/api/trips")
def get_trips():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
    )
    cur = conn.cursor()
    cur.execute("SELECT id, name, start_date, end_date FROM trips ORDER BY start_date")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {"id": r[0], "name": r[1], "start_date": r[2], "end_date": r[3]}
        for r in rows
    ]


@app.post("/api/trips")
def create_trip(trip: Trip):
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
    )
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO trips (name, start_date, end_date, description) VALUES (%s, %s, %s, %s)",
        (trip.name, trip.start_date, trip.end_date, trip.description if hasattr(trip, 'description') else None),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Trip created"}


@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: int):
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
    )
    cur = conn.cursor()
    cur.execute("SELECT id, name, start_date, end_date FROM trips WHERE id = %s", (trip_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return {"id": row[0], "name": row[1], "start_date": row[2], "end_date": row[3]}
    else:
        return {"error": "Trip not found"}, 404