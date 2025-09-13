from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/adventures", tags=["adventures"])


class Adventure(BaseModel):
    name: str
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


class AdventureUpdate(BaseModel):
    name: str | None = None
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


@router.get("/")
def list_adventures():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, notes, category, start_date, end_date, latitude, longitude, osm_name, osm_id, osm_country, osm_state
        FROM adventures
        ORDER BY start_date DESC NULLS LAST, id ASC
        """
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "notes": r["notes"] if r["notes"] else None,
            "category": r["category"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "osm_name": r["osm_name"],
            "osm_id": r["osm_id"],
            "osm_country": r["osm_country"],
            "osm_state": r["osm_state"],
        }
        for r in rows
    ]


@router.get("/{adventure_id}")
def get_adventure(adventure_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, notes, category, start_date, end_date, latitude, longitude, osm_name, osm_id, osm_country, osm_state
        FROM adventures WHERE id = %s
        """,
        (adventure_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Adventure not found")
    return {
        "id": row["id"],
        "name": row["name"],
        "notes": row["notes"] if row["notes"] else None,
        "category": row["category"],
        "start_date": row["start_date"],
        "end_date": row["end_date"],
        "latitude": row["latitude"],
        "longitude": row["longitude"],
        "osm_name": row["osm_name"],
        "osm_id": row["osm_id"],
        "osm_country": row["osm_country"],
        "osm_state": row["osm_state"],
    }


@router.post("/")
def create_adventure(adventure: Adventure):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO adventures (name, category, notes, start_date, end_date, latitude, longitude, osm_name, osm_id, osm_country, osm_state)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            adventure.name,
            adventure.category,
            adventure.notes,
            adventure.start_date,
            adventure.end_date,
            adventure.latitude,
            adventure.longitude,
            adventure.osm_name,
            adventure.osm_id,
            adventure.osm_country,
            adventure.osm_state,
        ),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Adventure created", "id": row["id"]}


@router.put("/{adventure_id}")
def update_adventure(adventure_id: int, update: AdventureUpdate):
    data = update.model_dump(exclude_unset=True) if hasattr(update, "model_dump") else update.dict(exclude_unset=True)
    allowed = {"name", "category", "notes", "start_date", "end_date", "latitude", "longitude", "osm_name", "osm_id", "osm_country", "osm_state"}
    data = {k: v for k, v in data.items() if k in allowed}
    if not data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
    params = list(data.values()) + [adventure_id]

    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE adventures SET {set_clause} WHERE id = %s RETURNING id", params)
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Adventure not found")
    return {"message": f"Adventure {adventure_id} updated"}


@router.delete("/{adventure_id}")
def delete_adventure(adventure_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM adventures WHERE id = %s RETURNING id", (adventure_id,))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Adventure not found")
    return {"message": "Adventure deleted"}
