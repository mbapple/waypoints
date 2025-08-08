from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/flight_details", tags=["flight_details"])


class FlightDetails(BaseModel):
    leg_id: int
    flight_number: str | None = None
    airline: str | None = None
    start_airport: str | None = None
    end_airport: str | None = None


class FlightDetailsUpdate(BaseModel):
    flight_number: str | None = None
    airline: str | None = None
    start_airport: str | None = None
    end_airport: str | None = None


@router.get("/{leg_id}")
def get_flight_details(leg_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT leg_id, flight_number, airline, start_airport, end_airport
        FROM flight_details
        WHERE leg_id = %s
        """,
        (leg_id,),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Flight details not found")

    return {
        "leg_id": row["leg_id"],
        "flight_number": row["flight_number"],
        "airline": row["airline"],
        "start_airport": row["start_airport"],
        "end_airport": row["end_airport"],
    }


@router.post("/")
def create_flight_details(details: FlightDetails):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO flight_details (leg_id, flight_number, airline, start_airport, end_airport)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (leg_id) DO UPDATE SET
            flight_number = EXCLUDED.flight_number,
            airline = EXCLUDED.airline,
            start_airport = EXCLUDED.start_airport,
            end_airport = EXCLUDED.end_airport
        RETURNING leg_id
        """,
        (details.leg_id, details.flight_number, details.airline, details.start_airport, details.end_airport),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {"message": f"Flight details saved for leg {row['leg_id']}"}


@router.put("/{leg_id}")
def update_flight_details(leg_id: int, update: FlightDetailsUpdate):
    data = update.model_dump(exclude_unset=True) if hasattr(update, "model_dump") else update.dict(exclude_unset=True)
    allowed = {"flight_number", "airline", "start_airport", "end_airport"}
    data = {k: v for k, v in data.items() if k in allowed}
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
