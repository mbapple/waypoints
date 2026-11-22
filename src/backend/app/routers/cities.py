"""Visited cities: the city each node and stop is in.

The city comes from a Nominatim reverse lookup at city level (zoom=10), which
returns the city itself (e.g. Paris, R7444) with its own OSM id and centre, so
places with different OSM ids in the same city group together.

- refresh_city(table, id): fill a row's osm_city* columns from its coordinates.
  Routers that save nodes/stops schedule it as a FastAPI background task, so
  the lookup (about 1 s on the public server) runs after the response is sent.
  Best effort, never raises.
- POST /api/cities/backfill: fix existing rows a few at a time (Settings page).
- GET /api/cities: visited cities for the map (visible nodes + all stops).
"""
import json
import logging
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import config
from .connect import get_db

router = APIRouter(prefix="/api/cities", tags=["cities"])
log = logging.getLogger(__name__)

TABLES = ("nodes", "stops")  # fixed identifiers; request values are checked against these
CITY_COLUMNS = ("osm_city", "osm_city_id", "osm_city_lat", "osm_city_lon")
USER_AGENT = "WayPoints (self-hosted travel tracker)"
MIN_INTERVAL_SECONDS = 1.1  # public Nominatim usage policy: max 1 request per second
TIMEOUT_SECONDS = 10
# A zoom=10 reverse lookup can return something bigger than a city (rural places)
NOT_A_CITY = {"country", "state", "region", "province", "state_district", "county"}

_lock = threading.Lock()
_last_request = [0.0]
_cache: dict = {}  # (lat, lon) rounded to ~100 m -> city dict or None


def _parse_city(data) -> dict | None:
    if not isinstance(data, dict) or data.get("error") or not data.get("osm_id"):
        return None
    if data.get("addresstype") in NOT_A_CITY:
        return None
    name = data.get("name") or str(data.get("display_name") or "").split(",")[0].strip()
    if not name:
        return None
    return {
        "osm_city": name,
        "osm_city_id": f"{str(data.get('osm_type') or 'x')[0].upper()}{data['osm_id']}",
        "osm_city_lat": float(data["lat"]),
        "osm_city_lon": float(data["lon"]),
    }


def lookup_city(lat: float, lon: float) -> dict | None:
    """City containing (lat, lon), or None if there isn't one. Raises on network errors."""
    key = (round(lat, 3), round(lon, 3))
    if key in _cache:
        return _cache[key]
    params = urllib.parse.urlencode({"format": "json", "lat": lat, "lon": lon, "zoom": 10})
    request = urllib.request.Request(
        f"{config.NOMINATIM_URL}/reverse?{params}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json", "Accept-Language": config.NOMINATIM_LANGUAGE},
    )
    with _lock:  # one request at a time, spaced out, across all callers
        if key in _cache:
            return _cache[key]
        wait = _last_request[0] + MIN_INTERVAL_SECONDS - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        finally:
            _last_request[0] = time.monotonic()
    city = _parse_city(data)
    _cache[key] = city
    return city


def _set_city(cur, table: str, row_id: int, city: dict | None) -> None:
    assignments = ", ".join(f"{c} = %s" for c in CITY_COLUMNS)
    values = [city[c] if city else None for c in CITY_COLUMNS]
    cur.execute(f"UPDATE {table} SET {assignments} WHERE id = %s", (*values, row_id))


def refresh_city(table: str, row_id: int) -> None:
    """Fill a node/stop's city from its coordinates. Never raises: a geocoder
    outage must not break saving, and the row can be fixed later by the backfill."""
    if table not in TABLES:
        raise ValueError(table)
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT latitude, longitude FROM {table} WHERE id = %s", (row_id,))
        row = cur.fetchone()
        if not row:
            return
        lat, lon = row["latitude"], row["longitude"]
        city = lookup_city(lat, lon) if lat is not None and lon is not None else None
        _set_city(cur, table, row_id, city)
        conn.commit()
    except Exception as e:  # noqa: BLE001 - best effort by design
        conn.rollback()
        log.warning("City lookup failed for %s %s: %s", table, row_id, e)
    finally:
        cur.close()
        conn.close()


def refresh_cities(table: str, row_ids) -> None:
    """refresh_city for several rows (lookups are cached, so shared places cost one request)."""
    for row_id in row_ids:
        refresh_city(table, row_id)


def _missing_counts(cur) -> dict:
    out = {}
    for t in TABLES:
        cur.execute(
            f"SELECT COUNT(*) AS n FROM {t} WHERE osm_city_id IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL"
        )
        out[t] = int(cur.fetchone()["n"])
    return out


@router.get("/")
@router.get("")
def list_cities():
    """Visited cities: visible nodes and all stops, grouped by their city."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        WITH places AS (
            SELECT osm_city_id, osm_city, osm_city_lat, osm_city_lon, trip_id, 'node' AS kind
            FROM nodes WHERE osm_city_id IS NOT NULL AND invisible IS NOT TRUE
            UNION ALL
            SELECT osm_city_id, osm_city, osm_city_lat, osm_city_lon, trip_id, 'stop'
            FROM stops WHERE osm_city_id IS NOT NULL
        )
        SELECT p.osm_city_id,
               MIN(p.osm_city) AS name,
               AVG(p.osm_city_lat) AS latitude,
               AVG(p.osm_city_lon) AS longitude,
               COUNT(*) FILTER (WHERE p.kind = 'node') AS node_count,
               COUNT(*) FILTER (WHERE p.kind = 'stop') AS stop_count,
               (SELECT COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)
                                         ORDER BY t.start_date NULLS LAST, t.id), '[]'::json)
                  FROM trips t
                 WHERE t.id IN (SELECT trip_id FROM places p2 WHERE p2.osm_city_id = p.osm_city_id)) AS trips
        FROM places p
        GROUP BY p.osm_city_id
        ORDER BY MIN(p.osm_city)
        """
    )
    rows = cur.fetchall() or []
    cur.close()
    conn.close()
    return [
        {
            "key": r["osm_city_id"],
            "osm_city_id": r["osm_city_id"],
            "name": r["name"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "node_count": int(r["node_count"] or 0),
            "stop_count": int(r["stop_count"] or 0),
            "trips": r["trips"] or [],
        }
        for r in rows
    ]


@router.get("/status")
def city_status():
    """Nodes/stops with coordinates but no city yet."""
    conn = get_db()
    cur = conn.cursor()
    try:
        return {"missing": _missing_counts(cur)}
    finally:
        cur.close()
        conn.close()


class BackfillRequest(BaseModel):
    table: str = "nodes"
    after_id: int = 0  # resume cursor: rows with a larger id are processed next
    limit: int = Field(5, ge=1, le=20)


@router.post("/backfill")
def backfill_cities(req: BackfillRequest):
    """Look up the city for up to `limit` rows that lack one, starting after the
    cursor. Returns each row's outcome and the cursor for the next call
    (`next` is null when every table is done). Rows with no city are reported
    and skipped, so one run always finishes."""
    if req.table not in TABLES:
        raise HTTPException(status_code=400, detail="Unknown table")
    table = req.table
    conn = get_db()
    cur = conn.cursor()
    results = []
    last_id = req.after_id
    try:
        cur.execute(
            f"""
            SELECT id, name, latitude, longitude FROM {table}
            WHERE osm_city_id IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL AND id > %s
            ORDER BY id LIMIT %s
            """,
            (req.after_id, req.limit),
        )
        rows = cur.fetchall() or []
        for r in rows:
            last_id = r["id"]
            result = {"table": table, "id": r["id"], "name": r["name"]}
            try:
                city = lookup_city(r["latitude"], r["longitude"])
            except (urllib.error.URLError, TimeoutError, ValueError) as e:
                results.append({**result, "status": "error", "error": str(getattr(e, "reason", e))})
                continue
            if city:
                _set_city(cur, table, r["id"], city)
                conn.commit()
            results.append({**result, "status": "found" if city else "none", "city": city and city["osm_city"]})

        if len(rows) == req.limit:
            nxt = {"table": table, "after_id": last_id}
        else:
            idx = TABLES.index(table) + 1
            nxt = {"table": TABLES[idx], "after_id": 0} if idx < len(TABLES) else None
        return {"results": results, "next": nxt, "missing": _missing_counts(cur)}
    finally:
        cur.close()
        conn.close()
