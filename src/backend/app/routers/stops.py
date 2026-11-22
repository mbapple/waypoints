from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, field_validator

#from src.backend.app.routers.connect import get_db
from .connect import get_db
from .cities import refresh_city

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
    is_lodging: bool = False

    # A stop doesn't need a location; treat blank coordinates from forms as "none"
    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def _blank_coord_is_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

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
    is_lodging: bool | None = None

    # A stop doesn't need a location; treat blank coordinates from forms as "none"
    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def _blank_coord_is_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

# Columns a stop can be created with; also the columns PUT may update.
WRITE_COLS = (
    "trip_id", "name", "leg_id", "node_id", "category", "notes", "start_date", "end_date",
    "latitude", "longitude", "osm_name", "osm_id", "osm_country", "osm_state", "is_lodging",
)


def _select_cols(*link_cols):
    """Columns returned for a stop; link_cols picks which of leg_id / node_id are included."""
    return ("id", "trip_id", "name", "notes", "category", *link_cols, "start_date", "end_date",
            "latitude", "longitude", "osm_name", "osm_id", "osm_country", "osm_state", "is_lodging")


def _stop_dict(row, cols):
    d = {c: row[c] for c in cols}
    d["notes"] = d["notes"] or None
    return d


def _list_stops(where_col, value, link_cols):
    # where_col is always a fixed column name from this module, never request input
    cols = _select_cols(*link_cols)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"""
    SELECT {", ".join(cols)}
        FROM stops
        WHERE {where_col} = %s
    ORDER BY start_date ASC NULLS LAST, updated_at ASC NULLS LAST
    """, (value,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [_stop_dict(r, cols) for r in rows]

# Return a list of all stops corresponding to a specific leg
@router.get("/by_leg/{leg_id}")
def get_stops_by_leg(leg_id: int):
    return _list_stops("leg_id", leg_id, ("leg_id",))

# Return a list of all stops corresponding to a specific node
@router.get("/by_node/{node_id}")
def get_stops_by_node(node_id: int):
    return _list_stops("node_id", node_id, ("node_id",))

# Return a list of all stops corresponding to a specific trip
@router.get("/by_trip/{trip_id}")
def get_stops_by_trip(trip_id: int):
    return _list_stops("trip_id", trip_id, ("node_id", "leg_id"))

@router.post("/")
@router.post("")
def create_stop(stop: Stop, background_tasks: BackgroundTasks):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"""
    INSERT INTO stops ({", ".join(WRITE_COLS)})
    VALUES ({", ".join(["%s"] * len(WRITE_COLS))})
    RETURNING id
    """, [getattr(stop, c) for c in WRITE_COLS])
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    background_tasks.add_task(refresh_city, "stops", row["id"])
    return {"message": "Stop created successfully", "id": row["id"]}

@router.get("/{stop_id}")
def get_stop_by_id(stop_id: int):
    cols = _select_cols("leg_id", "node_id")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"SELECT {', '.join(cols)} FROM stops WHERE id = %s", (stop_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Stop not found")
    return _stop_dict(row, cols)


@router.put("/{stop_id}")
def update_stop(stop_id: int, update: StopUpdate, background_tasks: BackgroundTasks):
    data = update.model_dump(exclude_unset=True) if hasattr(update, "model_dump") else update.dict(exclude_unset=True)
    data = {k: v for k, v in data.items() if k in WRITE_COLS}
    if data.get("is_lodging", False) is None:  # column is NOT NULL; null means "leave as is"
        del data["is_lodging"]
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

    if "latitude" in data or "longitude" in data:
        background_tasks.add_task(refresh_city, "stops", stop_id)
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