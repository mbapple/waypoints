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