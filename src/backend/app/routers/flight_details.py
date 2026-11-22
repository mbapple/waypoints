from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .connect import get_db

router = APIRouter(prefix="/api/flight_details", tags=["flight_details"])

# Every flight_details column besides leg_id. SQL below is built only from this
# fixed list, never from request data.
FLIGHT_COLUMNS = (
    "flight_number", "airline", "start_airport", "end_airport",
    "polyline",  # recorded track (encoded polyline); NULL = great-circle route
    "track_source",
    "aircraft_icao24", "aircraft_registration", "aircraft_type", "aircraft_icao_type",
    "aircraft_photo", "aircraft_photo_credit", "aircraft_photo_link",
)


class FlightDetailsFields(BaseModel):
    flight_number: str | None = None
    airline: str | None = None
    start_airport: str | None = None
    end_airport: str | None = None
    polyline: str | None = None
    track_source: str | None = None
    aircraft_icao24: str | None = None
    aircraft_registration: str | None = None
    aircraft_type: str | None = None
    aircraft_icao_type: str | None = None
    aircraft_photo: str | None = None  # /uploads/aircraft/<REG>.jpg
    aircraft_photo_credit: str | None = None
    aircraft_photo_link: str | None = None


class FlightDetails(FlightDetailsFields):
    leg_id: int


def upsert_flight_details(cur, leg_id: int, fields: dict):
    """Insert or replace a leg's flight details (all columns; missing ones become NULL)."""
    columns = ", ".join(FLIGHT_COLUMNS)
    placeholders = ", ".join(["%s"] * len(FLIGHT_COLUMNS))
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in FLIGHT_COLUMNS)
    cur.execute(
        f"INSERT INTO flight_details (leg_id, {columns}) VALUES (%s, {placeholders}) "
        f"ON CONFLICT (leg_id) DO UPDATE SET {updates}",
        [leg_id] + [fields.get(c) for c in FLIGHT_COLUMNS],
    )


@router.get("/{leg_id}")
def get_flight_details(leg_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"SELECT leg_id, {', '.join(FLIGHT_COLUMNS)} FROM flight_details WHERE leg_id = %s", (leg_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Flight details not found")
    return dict(row)


@router.post("/")
@router.post("")
def create_flight_details(details: FlightDetails):
    conn = get_db()
    cur = conn.cursor()
    upsert_flight_details(cur, details.leg_id, details.model_dump())
    conn.commit()
    cur.close()
    conn.close()

    return {"message": f"Flight details saved for leg {details.leg_id}"}


@router.put("/{leg_id}")
def update_flight_details(leg_id: int, update: FlightDetailsFields):
    data = {k: v for k, v in update.model_dump(exclude_unset=True).items() if k in FLIGHT_COLUMNS}
    if not data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    set_clauses = ", ".join([f"{col} = %s" for col in data.keys()])
    params = list(data.values()) + [leg_id]

    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE flight_details SET {set_clauses} WHERE leg_id = %s RETURNING leg_id", params)
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Flight details not found")

    return {"message": f"Flight details for leg {leg_id} updated"}


@router.delete("/{leg_id}")
def delete_flight_details(leg_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM flight_details WHERE leg_id = %s RETURNING leg_id", (leg_id,))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Flight details not found")

    return {"message": f"Flight details for leg {leg_id} deleted"}
