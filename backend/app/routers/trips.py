from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/trips", tags=["trips"])

# Trip model for input validation
class Trip(BaseModel):
    name: str
    start_date: str
    end_date: str
    description: str | None = None

# Trip update model (all fields optional; only provided fields are updated)
class TripUpdate(BaseModel):
    name: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None


# Return a list of all trips in order by start date
@router.get("/")
def get_trips():
    conn = get_db()
    #print("Connection is type:", type(conn))
    cur = conn.cursor()
    cur.execute("SELECT id, name, start_date, end_date FROM trips ORDER BY start_date")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {"id": r["id"], "name": r["name"], "start_date": r["start_date"], "end_date": r["end_date"]}
        for r in rows
    ]

# Create a new trip
@router.post("/")
def create_trip(trip: Trip):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO trips (name, start_date, end_date, description) VALUES (%s, %s, %s, %s) RETURNING id",
        (trip.name, trip.start_date, trip.end_date, trip.description),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Trip created", "id": row["id"]}


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
    

@router.put("/{trip_id}")
def update_trip(trip_id: int, update: TripUpdate):
    data = update.model_dump(exclude_unset=True) if hasattr(update, "model_dump") else update.dict(exclude_unset=True)
    allowed = {"name", "start_date", "end_date", "description"}
    data = {k: v for k, v in data.items() if k in allowed}
    if not data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    set_clauses = ", ".join([f"{col} = %s" for col in data.keys()])
    params = list(data.values()) + [trip_id]

    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE trips SET {set_clauses} WHERE id = %s RETURNING id", params)
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")

    return {"message": f"Trip {trip_id} updated"}

@router.delete("/{trip_id}")
def delete_trip(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM trips WHERE id = %s RETURNING id", (trip_id,))
    deleted = cur.fetchone()

    # Delete associated nodes and legs
    cur.execute("DELETE FROM nodes WHERE trip_id = %s", (trip_id,))
    cur.execute("DELETE FROM legs WHERE trip_id = %s", (trip_id,))

    conn.commit()
    cur.close()
    conn.close()

    if deleted:
        return {"message": f"Trip {trip_id} and all associate legs and nodes deleted"}
    else:
        raise HTTPException(status_code=404, detail="Trip not found")
    





@router.get("/{trip_id}/all_nodes_and_legs")
def get_all_nodes_and_legs(trip_id: int):
    conn = get_db()
    cur = conn.cursor()

    # Fetch nodes
    cur.execute("""
        SELECT id, name, description, trip_id, latitude, longitude, arrival_date, departure_date, notes
        FROM nodes
        WHERE trip_id = %s
        ORDER BY arrival_date
    """, (trip_id,))
    nodes = cur.fetchall()

    # Fetch legs
    cur.execute("""
        SELECT id, trip_id, type, start_node_id, end_node_id, miles, notes
        FROM legs
        WHERE trip_id = %s
        ORDER BY id
    """, (trip_id,))
    legs = cur.fetchall()

    cur.close()
    conn.close()

    # Convert to dictionaries for easier lookup
    nodes_dict = {
        n["id"]: {
            "id": n["id"],
            "name": n["name"],
            "description": n["description"],
            "trip_id": n["trip_id"],
            "latitude": n["latitude"],
            "longitude": n["longitude"],
            "arrival_date": n["arrival_date"],
            "departure_date": n["departure_date"],
            "notes": n["notes"] if n["notes"] else None
        }
        for n in nodes
    }

    legs_list = [
        {
            "id": l["id"],
            "trip_id": l["trip_id"],
            "type": l["type"],
            "start_node_id": l["start_node_id"],
            "end_node_id": l["end_node_id"],
            "miles": l["miles"],
            "notes": l["notes"] if l["notes"] else None
        }
        for l in legs
    ]

    # Build ordered sequence: Node -> Leg -> Node -> Leg -> ...
    ordered_sequence = []
    
    if nodes:
        # Start with the first node (earliest arrival_date)
        ordered_nodes = sorted(nodes, key=lambda n: n["arrival_date"] or "")
        current_node_id = ordered_nodes[0]["id"]
        ordered_sequence.append({"type": "node", "data": nodes_dict[current_node_id]})
        
        # Find legs and next nodes in sequence
        remaining_legs = legs_list.copy()
        
        while remaining_legs:
            # Find leg that starts from current node
            leg_found = None
            for i, leg in enumerate(remaining_legs):
                if leg["start_node_id"] == current_node_id:
                    leg_found = remaining_legs.pop(i)
                    break
            
            if leg_found:
                ordered_sequence.append({"type": "leg", "data": leg_found})
                # Add the end node
                next_node_id = leg_found["end_node_id"]
                if next_node_id in nodes_dict:
                    ordered_sequence.append({"type": "node", "data": nodes_dict[next_node_id]})
                    current_node_id = next_node_id
                else:
                    break
            else:
                break

    return {"sequence": ordered_sequence}


@router.get("/{trip_id}/miles")
def get_total_miles(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT SUM(miles) AS total_miles FROM legs WHERE trip_id = %s", (trip_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    total_miles = row["total_miles"] if row and row["total_miles"] is not None else 0
    return {"total_miles": total_miles}

@router.get("/data/statistics")
def get_trip_statistics():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT SUM(miles) AS all_trip_miles FROM legs")
    miles_row = cur.fetchone()
    all_trip_miles = miles_row["all_trip_miles"] if miles_row and miles_row["all_trip_miles"] is not None else 0
    all_trip_miles = round(all_trip_miles)

    cur.execute("""
        SELECT
            (COUNT(DISTINCT osm_id) FILTER (WHERE osm_id IS NOT NULL)
             + COUNT(*) FILTER (WHERE osm_id IS NULL)) AS unique_destination_count
        FROM nodes
        WHERE (invisible IS NOT TRUE)
    """)
    destinations_row = cur.fetchone()
    unique_destination_count = destinations_row["unique_destination_count"] if destinations_row and destinations_row["unique_destination_count"] is not None else 0

    cur.execute("SELECT SUM(miles) AS all_flight_miles FROM legs WHERE type = 'flight'")
    flight_miles_row = cur.fetchone()
    all_flight_miles = flight_miles_row["all_flight_miles"] if flight_miles_row and flight_miles_row["all_flight_miles"] is not None else 0

    cur.execute("SELECT SUM(miles) AS all_car_miles FROM legs WHERE type = 'car'")
    drive_miles_row = cur.fetchone()
    all_car_miles = drive_miles_row["all_car_miles"] if drive_miles_row and drive_miles_row["all_car_miles"] is not None else 0

    cur.execute("SELECT COUNT(DISTINCT osm_country) AS country_count FROM nodes WHERE osm_country IS NOT NULL")
    country_row = cur.fetchone()
    country_count = country_row["country_count"] if country_row and country_row["country_count"] is not None else 0

    cur.execute("SELECT COUNT(DISTINCT osm_state) AS state_count FROM nodes WHERE osm_state IS NOT NULL")
    state_row = cur.fetchone()
    state_count = state_row["state_count"] if state_row and state_row["state_count"] is not None else 0

    # Miles grouped by each travel type
    cur.execute("""
        SELECT type, COALESCE(SUM(miles), 0) AS total_miles
        FROM legs
        GROUP BY type
    """)
    miles_by_type_rows = cur.fetchall() or []
    miles_by_type = {r["type"]: round(r["total_miles"] or 0) for r in miles_by_type_rows if r["type"] is not None}
    # Ensure car and flight are always present in miles_by_type
    miles_by_type["flight"] = round(all_flight_miles or 0)
    miles_by_type["car"] = round(all_car_miles or 0)

    # Total nights across all trips: merge overlapping date ranges and sum, counting only time actually on trips
    cur.execute(
        """
        SELECT start_date, end_date
        FROM trips
        WHERE start_date IS NOT NULL AND end_date IS NOT NULL
        ORDER BY start_date
        """
    )
    trip_ranges = cur.fetchall() or []
    merged: list[list] = []  # list of [start_date, end_date]
    for r in trip_ranges:
        s = r["start_date"]
        e = r["end_date"]
        if not s or not e or e <= s:
            continue
        if not merged:
            merged.append([s, e])
        else:
            last_s, last_e = merged[-1]
            if s <= last_e:
                if e > last_e:
                    merged[-1][1] = e
            else:
                merged.append([s, e])
    total_nights = sum((e - s).days for s, e in merged)

    # States by country from nodes (unique states per country)
    cur.execute(
        """
        SELECT osm_country, ARRAY_AGG(DISTINCT osm_state ORDER BY osm_state) AS states
        FROM nodes
        WHERE osm_country IS NOT NULL AND (invisible IS NOT TRUE)
        
        GROUP BY osm_country
        ORDER BY osm_country
        """
    )
    states_rows = cur.fetchall() or []
    states_by_country = {r["osm_country"]: [s for s in (r["states"] or []) if s is not None] for r in states_rows}

    # Destinations by country (count of unique OSM places per country)
    cur.execute(
        """
        SELECT osm_country, COUNT(DISTINCT osm_id) AS dest_count
        FROM nodes
        WHERE osm_country IS NOT NULL AND osm_id IS NOT NULL AND (invisible IS NOT TRUE)
        GROUP BY osm_country
        ORDER BY osm_country
        """
    )
    dest_rows = cur.fetchall() or []
    destinations_by_country = {r["osm_country"]: int(r["dest_count"] or 0) for r in dest_rows}

    # Stops by category counts (ensure all categories present)
    cur.execute(
        """
        SELECT category, COUNT(*) AS cnt
        FROM stops
        GROUP BY category
        """
    )
    cat_rows = cur.fetchall() or []
    categories = {r["category"]: int(r["cnt"] or 0) for r in cat_rows}
    for key in ('hotel','restaurant','attraction','park','other'):
        categories.setdefault(key, 0)

    # Trip count
    cur.execute("SELECT COUNT(*) AS trip_count FROM trips")
    trip_row = cur.fetchone()
    trip_count = trip_row["trip_count"] if trip_row and trip_row["trip_count"] is not None else 0

    cur.close()
    conn.close()

    return {
        "all_trip_miles": all_trip_miles,
        "trip_count": trip_count,
        "unique_destination_count": unique_destination_count,
        "country_count": country_count,
        "state_count": state_count,
        "miles_by_type": miles_by_type,
        "total_nights": total_nights,
        "states_by_country": states_by_country,
        "destinations_by_country": destinations_by_country,
        "stops_by_category": categories,
    }


@router.get("/data/trips_by_miles")
def get_trips_by_miles():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT t.id, t.name, COALESCE(SUM(l.miles), 0) AS total_miles
        FROM trips t
        LEFT JOIN legs l ON l.trip_id = t.id
        GROUP BY t.id, t.name
        ORDER BY total_miles DESC, t.start_date ASC
        """
    )
    rows = cur.fetchall() or []
    cur.close()
    conn.close()
    return [
        {"id": r["id"], "name": r["name"], "total_miles": round(r["total_miles"] or 0)}
        for r in rows
    ]


@router.get("/data/trips_by_nights")
def get_trips_by_nights():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT t.id, t.name,
               COALESCE(GREATEST(0, (t.end_date::date - t.start_date::date)), 0)::int AS nights
        FROM trips t
        WHERE t.start_date IS NOT NULL AND t.end_date IS NOT NULL
        ORDER BY nights DESC, t.start_date ASC
        """
    )
    rows = cur.fetchall() or []
    cur.close()
    conn.close()
    return [
        {"id": r["id"], "name": r["name"], "nights": int(r["nights"] or 0)}
        for r in rows
    ]


@router.get("/data/legs_by_type")
def get_legs_by_type(type: str):
    if not type:
        raise HTTPException(status_code=400, detail="type is required")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT 
            l.id, 
            l.trip_id, 
            t.name AS trip_name, 
            l.type, 
            l.start_node_id, 
            l.end_node_id, 
            l.miles,
            COALESCE(ns.name, l.start_osm_name) AS start_name,
            COALESCE(ne.name, l.end_osm_name)   AS end_name
        FROM legs l
        JOIN trips t ON t.id = l.trip_id
        LEFT JOIN nodes ns ON ns.id = l.start_node_id
        LEFT JOIN nodes ne ON ne.id = l.end_node_id
        WHERE l.type = %s
        ORDER BY l.miles DESC NULLS LAST, l.id ASC
        """,
        (type,)
    )
    rows = cur.fetchall() or []
    cur.close()
    conn.close()
    return [
        {
            "id": r["id"],
            "trip_id": r["trip_id"],
            "trip_name": r["trip_name"],
            "type": r["type"],
            "start_node_id": r["start_node_id"],
            "end_node_id": r["end_node_id"],
            "start_name": r.get("start_name"),
            "end_name": r.get("end_name"),
            "miles": r["miles"] or 0,
        }
        for r in rows
    ]


@router.get("/data/nodes_by_country")
def get_nodes_by_country(country: str):
    if not country:
        raise HTTPException(status_code=400, detail="country is required")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT osm_id,
               MIN(name) AS name,
               osm_country,
               ARRAY_AGG(DISTINCT trip_id) AS trip_ids
        FROM nodes
        WHERE osm_country = %s AND osm_id IS NOT NULL AND (invisible IS NOT TRUE)
        GROUP BY osm_id, osm_country
        ORDER BY name NULLS LAST
        """,
        (country,)
    )
    rows = cur.fetchall() or []
    cur.close()
    conn.close()
    return [
        {
            "osm_id": r["osm_id"],
            "name": r["name"],
            "osm_country": r["osm_country"],
            "trip_ids": [int(t) for t in (r["trip_ids"] or []) if t is not None],
        }
        for r in rows
    ]


@router.get("/data/nodes_by_state")
def get_nodes_by_state(state: str, country: str | None = None):
    if not state:
        raise HTTPException(status_code=400, detail="state is required")
    conn = get_db()
    cur = conn.cursor()
    if country:
        cur.execute(
            """
            SELECT osm_id,
                   MIN(name) AS name,
                   osm_country,
                   osm_state,
                   ARRAY_AGG(DISTINCT trip_id) AS trip_ids
            FROM nodes
            WHERE osm_state = %s AND osm_country = %s AND osm_id IS NOT NULL AND (invisible IS NOT TRUE)
            GROUP BY osm_id, osm_country, osm_state
            ORDER BY name NULLS LAST
            """,
            (state, country),
        )
    else:
        cur.execute(
            """
            SELECT osm_id,
                   MIN(name) AS name,
                   osm_country,
                   osm_state,
                   ARRAY_AGG(DISTINCT trip_id) AS trip_ids
            FROM nodes
            WHERE osm_state = %s AND osm_id IS NOT NULL AND (invisible IS NOT TRUE)
            GROUP BY osm_id, osm_country, osm_state
            ORDER BY name NULLS LAST
            """,
            (state,),
        )
    rows = cur.fetchall() or []
    cur.close()
    conn.close()
    return [
        {
            "osm_id": r["osm_id"],
            "name": r["name"],
            "osm_country": r.get("osm_country"),
            "osm_state": r.get("osm_state"),
            "trip_ids": [int(t) for t in (r["trip_ids"] or []) if t is not None],
        }
        for r in rows
    ]


@router.get("/data/trips_by_osm")
def get_trips_by_osm(osm_id: str):
    if not osm_id:
        raise HTTPException(status_code=400, detail="osm_id is required")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT DISTINCT t.id, t.name
        FROM nodes n
        JOIN trips t ON t.id = n.trip_id
        WHERE n.osm_id = %s
        ORDER BY t.start_date
        """,
        (osm_id,)
    )
    rows = cur.fetchall() or []
    cur.close()
    conn.close()
    return [{"id": r["id"], "name": r["name"]} for r in rows]

@router.get("/data/stops_by_category")
def get_stops_by_category(category: str):
    if not category:
        raise HTTPException(status_code=400, detail="category is required")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT s.name AS stop_name, s.date AS stop_date, t.id AS trip_id, t.name AS trip_name
        FROM stops s
        LEFT JOIN trips t ON t.id = s.trip_id
        WHERE s.category = %s
        ORDER BY s.date DESC NULLS LAST, s.id ASC
        """,
        (category,)
    )
    rows = cur.fetchall() or []
    cur.close()
    conn.close()
    return [
        {
            "name": r["stop_name"],
            "date": r["stop_date"],
            "trip_id": r.get("trip_id"),
            "trip_name": r.get("trip_name"),
        }
        for r in rows
    ]
