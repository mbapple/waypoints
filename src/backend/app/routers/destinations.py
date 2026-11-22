"""Visited places across all trips: unique destinations (cities), airports, and
merging duplicate destinations into one OSM place."""
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from .connect import get_db
from .cities import refresh_cities

router = APIRouter(prefix="/api/destinations", tags=["destinations"])


class MergeSources(BaseModel):
    osm_ids: list[str] = Field(default_factory=list)  # destinations that have an OSM id
    node_ids: list[int] = Field(default_factory=list)  # destinations without one (single node each)


class MergeTarget(BaseModel):
    name: str = Field(..., min_length=1)
    osm_id: str = Field(..., min_length=1)
    osm_name: str | None = None
    osm_country: str | None = None
    osm_state: str | None = None
    latitude: float
    longitude: float


class MergeRequest(BaseModel):
    sources: MergeSources
    target: MergeTarget


def _trip_list(trip_ids, trip_names):
    """Zip parallel trip id/name arrays into [{id, name}], dropping NULLs."""
    return [
        {"id": int(i), "name": n}
        for i, n in zip(trip_ids or [], trip_names or [])
        if i is not None
    ]


# Unique destinations: visible nodes grouped by OSM place. Nodes without an
# osm_id each count as their own destination, matching unique_destination_count
# in /api/trips/data/statistics.
@router.get("/")
@router.get("")
def list_destinations():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        WITH n AS (
            SELECT n.*, COALESCE(n.osm_id, 'node:' || n.id) AS dest_key
            FROM nodes n
            WHERE n.invisible IS NOT TRUE
        ),
        dest_trips AS (
            SELECT DISTINCT n.dest_key, t.id, t.name, t.start_date
            FROM n JOIN trips t ON t.id = n.trip_id
        )
        SELECT n.dest_key,
               MIN(n.osm_id) AS osm_id,
               CASE WHEN MIN(n.osm_id) IS NULL THEN MIN(n.id) END AS node_id,
               MIN(n.name) AS name,
               MIN(n.osm_name) AS osm_name,
               MIN(n.osm_country) AS osm_country,
               MIN(n.osm_state) AS osm_state,
               AVG(n.latitude) AS latitude,
               AVG(n.longitude) AS longitude,
               COUNT(*) AS node_count,
               (SELECT ARRAY_AGG(dt.id ORDER BY dt.start_date NULLS LAST, dt.id)
                  FROM dest_trips dt WHERE dt.dest_key = n.dest_key) AS trip_ids,
               (SELECT ARRAY_AGG(dt.name ORDER BY dt.start_date NULLS LAST, dt.id)
                  FROM dest_trips dt WHERE dt.dest_key = n.dest_key) AS trip_names
        FROM n
        GROUP BY n.dest_key
        ORDER BY MIN(n.name) NULLS LAST
        """
    )
    rows = cur.fetchall() or []
    cur.close()
    conn.close()
    return [
        {
            "key": r["dest_key"],
            "osm_id": r["osm_id"],
            "node_id": r["node_id"],
            "name": r["name"],
            "osm_name": r["osm_name"],
            "osm_country": r["osm_country"],
            "osm_state": r["osm_state"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "node_count": int(r["node_count"] or 0),
            "trips": _trip_list(r["trip_ids"], r["trip_names"]),
        }
        for r in rows
    ]


# Airports: both ends of every flight leg, including invisible nodes (layovers
# are usually stored as invisible nodes).
@router.get("/airports")
def list_airports():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT l.id AS leg_id, t.id AS trip_id, t.name AS trip_name, t.start_date,
               COALESCE(l.start_latitude, n.latitude) AS latitude,
               COALESCE(l.start_longitude, n.longitude) AS longitude,
               COALESCE(n.name, l.start_osm_name) AS name,
               COALESCE(n.osm_id, l.start_osm_id) AS osm_id,
               n.id AS node_id,
               fd.start_airport AS code
        FROM legs l
        JOIN trips t ON t.id = l.trip_id
        LEFT JOIN nodes n ON n.id = l.start_node_id
        LEFT JOIN flight_details fd ON fd.leg_id = l.id
        WHERE l.type = 'flight'
        UNION ALL
        SELECT l.id, t.id, t.name, t.start_date,
               COALESCE(l.end_latitude, n.latitude),
               COALESCE(l.end_longitude, n.longitude),
               COALESCE(n.name, l.end_osm_name),
               COALESCE(n.osm_id, l.end_osm_id),
               n.id,
               fd.end_airport
        FROM legs l
        JOIN trips t ON t.id = l.trip_id
        LEFT JOIN nodes n ON n.id = l.end_node_id
        LEFT JOIN flight_details fd ON fd.leg_id = l.id
        WHERE l.type = 'flight'
        ORDER BY start_date NULLS LAST, leg_id
        """
    )
    rows = cur.fetchall() or []
    cur.close()
    conn.close()

    airports: dict[str, dict] = {}
    for r in rows:
        lat, lon = r["latitude"], r["longitude"]
        if lat is None or lon is None:
            continue
        code = (r["code"] or "").strip().upper() or None
        if code:
            key = f"code:{code}"
        elif r["osm_id"]:
            key = f"osm:{r['osm_id']}"
        elif r["node_id"]:
            key = f"node:{r['node_id']}"
        else:
            key = f"pos:{round(lat, 3)},{round(lon, 3)}"
        a = airports.get(key)
        if a is None:
            a = airports[key] = {
                "key": key,
                "code": code,
                "name": r["name"] or code,
                "latitude": lat,
                "longitude": lon,
                "visit_count": 0,
                "trips": [],
            }
        a["visit_count"] += 1
        if not a["name"] and r["name"]:
            a["name"] = r["name"]
        if not any(t["id"] == r["trip_id"] for t in a["trips"]):
            a["trips"].append({"id": r["trip_id"], "name": r["trip_name"]})

    return sorted(airports.values(), key=lambda a: (a["name"] or a["code"] or "").lower())


# Merge destinations: every node of the source destinations becomes the target
# place (name, OSM fields and coordinates). Leg endpoints at those nodes follow,
# and osm_id-based lists are rewritten to the target osm_id.
@router.post("/merge")
def merge_destinations(payload: MergeRequest, background_tasks: BackgroundTasks):
    src_osm = sorted({s.strip() for s in payload.sources.osm_ids if s and s.strip()})
    src_nodes = sorted(set(payload.sources.node_ids))
    t = payload.target
    if not src_osm and not src_nodes:
        raise HTTPException(status_code=400, detail="No destinations selected")
    if not src_nodes and src_osm == [t.osm_id]:
        raise HTTPException(status_code=400, detail="Target is the only selected destination; nothing to merge")

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id FROM nodes WHERE osm_id = ANY(%s) OR id = ANY(%s)",
            (src_osm, src_nodes),
        )
        node_ids = [r["id"] for r in cur.fetchall() or []]
        if not node_ids:
            raise HTTPException(status_code=404, detail="No nodes found for the selected destinations")

        cur.execute(
            """
            UPDATE nodes
            SET name = %s, osm_name = %s, osm_id = %s, osm_country = %s, osm_state = %s,
                latitude = %s, longitude = %s
            WHERE id = ANY(%s)
            """,
            (t.name, t.osm_name, t.osm_id, t.osm_country, t.osm_state, t.latitude, t.longitude, node_ids),
        )
        nodes_updated = cur.rowcount

        cur.execute(
            """
            UPDATE legs
            SET start_latitude = %s, start_longitude = %s, start_osm_name = %s,
                start_osm_id = %s, start_osm_country = %s, start_osm_state = %s
            WHERE start_node_id = ANY(%s) OR start_osm_id = ANY(%s)
            RETURNING id
            """,
            (t.latitude, t.longitude, t.osm_name, t.osm_id, t.osm_country, t.osm_state, node_ids, src_osm),
        )
        leg_ids = {r["id"] for r in cur.fetchall() or []}
        cur.execute(
            """
            UPDATE legs
            SET end_latitude = %s, end_longitude = %s, end_osm_name = %s,
                end_osm_id = %s, end_osm_country = %s, end_osm_state = %s
            WHERE end_node_id = ANY(%s) OR end_osm_id = ANY(%s)
            RETURNING id
            """,
            (t.latitude, t.longitude, t.osm_name, t.osm_id, t.osm_country, t.osm_state, node_ids, src_osm),
        )
        leg_ids |= {r["id"] for r in cur.fetchall() or []}

        lists_updated = 0
        if src_osm:
            cur.execute(
                """
                SELECT id, items, manual_overrides FROM lists
                WHERE match_type = 'osm_id' AND (items && %s OR manual_overrides && %s)
                """,
                (src_osm, src_osm),
            )
            src_set = set(src_osm)

            def rewrite(values):
                out = []
                for v in values or []:
                    v = t.osm_id if v in src_set else v
                    if v not in out:
                        out.append(v)
                return out

            for lst in cur.fetchall() or []:
                cur.execute(
                    "UPDATE lists SET items = %s, manual_overrides = %s, updated_at = now() WHERE id = %s",
                    (rewrite(lst["items"]), rewrite(lst["manual_overrides"]), lst["id"]),
                )
                lists_updated += 1

        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Merge failed: {e}")
    finally:
        cur.close()
        conn.close()

    # Merged nodes all sit at the target now: one (cached) lookup covers them
    background_tasks.add_task(refresh_cities, "nodes", node_ids)
    return {"nodes_updated": nodes_updated, "legs_updated": len(leg_ids), "lists_updated": lists_updated}
