"""Every flight leg with its flight and aircraft details, for the Flight Data page."""
from fastapi import APIRouter

from .connect import get_db
from .flight_details import FLIGHT_COLUMNS

router = APIRouter(prefix="/api/flights", tags=["flights"])


@router.get("/")
@router.get("")
def list_flights():
    """All flight legs, oldest first. Endpoints fall back to the leg's nodes."""
    details = ", ".join(f"fd.{c}" for c in FLIGHT_COLUMNS)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"""
        SELECT l.id AS leg_id, l.trip_id, t.name AS trip_name, l.date, l.miles,
               COALESCE(l.start_latitude, sn.latitude) AS start_latitude,
               COALESCE(l.start_longitude, sn.longitude) AS start_longitude,
               COALESCE(l.end_latitude, en.latitude) AS end_latitude,
               COALESCE(l.end_longitude, en.longitude) AS end_longitude,
               COALESCE(sn.name, l.start_osm_name) AS start_name,
               COALESCE(en.name, l.end_osm_name) AS end_name,
               {details}
        FROM legs l
        JOIN trips t ON t.id = l.trip_id
        LEFT JOIN nodes sn ON sn.id = l.start_node_id
        LEFT JOIN nodes en ON en.id = l.end_node_id
        LEFT JOIN flight_details fd ON fd.leg_id = l.id
        WHERE l.type = 'flight'
        ORDER BY l.date, l.id
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows
