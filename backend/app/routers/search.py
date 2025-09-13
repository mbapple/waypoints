from fastapi import APIRouter, Query
from typing import List, Any, Optional, Tuple, Set
import re
import datetime as _dt
import calendar as _cal

from connect import get_db

router = APIRouter(prefix="/api/search", tags=["search"])


def _extract_month_year(raw: str) -> Optional[Tuple[int, int]]:
    """Attempt to parse a month + year from many common formats.
    Returns (year, month) or None.
    Supported examples:
      August 2025 / Aug 2025 / 2025 August / 2025 Aug
      08/2025 / 8/2025 / 2025-08 / 2025/08
    """
    s = raw.strip()
    if not s:
        return None
    month_map = {
        'jan':1,'january':1,
        'feb':2,'february':2,
        'mar':3,'march':3,
        'apr':4,'april':4,
        'may':5,
        'jun':6,'june':6,
        'jul':7,'july':7,
        'aug':8,'august':8,
        'sep':9,'sept':9,'september':9,
        'oct':10,'october':10,
        'nov':11,'november':11,
        'dec':12,'december':12,
    }
    # MonthName Year
    m = re.search(r"\b([A-Za-z]{3,9})\s+(20\d{2}|19\d{2})\b", s, re.IGNORECASE)
    if m:
        mon = month_map.get(m.group(1).lower())
        if mon:
            return (int(m.group(2)), mon)
    # Year MonthName
    m = re.search(r"\b(20\d{2}|19\d{2})\s+([A-Za-z]{3,9})\b", s, re.IGNORECASE)
    if m:
        mon = month_map.get(m.group(2).lower())
        if mon:
            return (int(m.group(1)), mon)
    # MM/YYYY or M/YYYY
    m = re.search(r"\b(0?\d|1[0-2])[/\-](20\d{2}|19\d{2})\b", s)
    if m:
        mm = int(m.group(1))
        if 1 <= mm <= 12:
            return (int(m.group(2)), mm)
    # YYYY-MM or YYYY/M
    m = re.search(r"\b(20\d{2}|19\d{2})[/\-](0?\d|1[0-2])\b", s)
    if m:
        mm = int(m.group(2))
        if 1 <= mm <= 12:
            return (int(m.group(1)), mm)
    return None


@router.get("/")
def global_search(q: str = Query("", min_length=0), limit: int = Query(50, ge=1, le=200)) -> List[Any]:
    """Global fuzzy-ish search across trips, nodes, legs, and stops.

    Returns a unified list of result objects with a common shape:
    { type, id, trip_id, title, subtitle, date, start_date, end_date, matched_fields }
    """
    query = (q or "").strip()
    if len(query) < 2:
        # Short queries not allowed to avoid table scans
        return []

    cleaned = query.replace('%','').replace('_','')
    # Tokenize (basic) for advanced matching: allow words containing letters/numbers
    raw_tokens = [t for t in re.split(r"\s+", cleaned) if t]
    tokens = []
    for t in raw_tokens:
        safe = re.sub(r"[^A-Za-z0-9]+", "", t.lower())
        if safe:
            tokens.append(safe)
    # Limit number of tokens to avoid huge SQL
    if len(tokens) > 8:
        tokens = tokens[:8]

    # If multiple tokens, we'll require ALL tokens to appear (in any order, with gaps) across the concatenated text blob
    multi_token = len(tokens) > 1
    # Fallback single pattern (if multi token we still keep for matched_fields heuristics using first token)
    base_for_pattern = tokens[0] if multi_token else cleaned
    pattern = f"%{base_for_pattern}%"

    month_year = _extract_month_year(query)
    month_pattern: Optional[str] = None
    month_start: Optional[_dt.date] = None
    month_end: Optional[_dt.date] = None
    if month_year:
        y, m = month_year
        month_pattern = f"%{y}-{m:02d}%"
        month_start = _dt.date(y, m, 1)
        month_end = _dt.date(y, m, _cal.monthrange(y, m)[1])

    # Month-only query heuristic (e.g., "August 2025") – relax token AND logic
    month_only_query = False
    if month_year and len(tokens) <= 3:
        month_tokens = {t for t in tokens if re.fullmatch(r"(20\d{2}|19\d{2})", t) or re.fullmatch(r"(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)", t)}
        if month_tokens:
            month_only_query = True

    conn = get_db()
    cur = conn.cursor()
    # Build AND clauses for multi-token search (applied to each entity's concatenated blob)
    token_clauses_trip = token_clauses_node = token_clauses_leg = token_clauses_stop = ""
    params = {"p": pattern, "limit": limit, "mp": month_pattern}
    if multi_token and not month_only_query:
        for i, tk in enumerate(tokens):
            params[f"tk{i}"] = f"%{tk}%"
        # Define blob expressions once per entity type
    trip_blob = "(COALESCE(t.name,'') || ' ' || COALESCE(t.description,'') || ' ' || COALESCE(t.start_date::text,'') || ' ' || COALESCE(t.end_date::text,''))"
    node_blob = "(COALESCE(n.name,'') || ' ' || COALESCE(n.description,'') || ' ' || COALESCE(n.notes,'') || ' ' || COALESCE(n.osm_name,'') || ' ' || COALESCE(n.osm_country,'') || ' ' || COALESCE(n.osm_state,'') || ' ' || COALESCE(n.arrival_date::text,'') || ' ' || COALESCE(n.departure_date::text,''))"
    leg_blob = "(COALESCE(l.notes,'') || ' ' || COALESCE(l.type,'') || ' ' || COALESCE(l.start_osm_name,'') || ' ' || COALESCE(l.end_osm_name,'') || ' ' || COALESCE(l.start_osm_country,'') || ' ' || COALESCE(l.end_osm_country,'') || ' ' || COALESCE(l.start_osm_state,'') || ' ' || COALESCE(l.end_osm_state,'') || ' ' || COALESCE(l.date::text,'') || ' ' || COALESCE(fd.airline,'') || ' ' || COALESCE(fd.flight_number,'') || ' ' || COALESCE(fd.start_airport,'') || ' ' || COALESCE(fd.end_airport,''))"
    stop_blob = "(COALESCE(s.name,'') || ' ' || COALESCE(s.notes,'') || ' ' || COALESCE(s.category,'') || ' ' || COALESCE(s.osm_name,'') || ' ' || COALESCE(s.osm_country,'') || ' ' || COALESCE(s.osm_state,'') || ' ' || COALESCE(s.start_date::text,'') || ' ' || COALESCE(s.end_date::text,''))"
    token_parts = [f"{trip_blob} ILIKE %(tk{i})s" for i in range(len(tokens))]
    token_clauses_trip = f"AND ( {trip_blob} ILIKE %(p)s AND " + " AND ".join(token_parts) + " )"
    token_parts = [f"{node_blob} ILIKE %(tk{i})s" for i in range(len(tokens))]
    token_clauses_node = f"AND ( {node_blob} ILIKE %(p)s AND " + " AND ".join(token_parts) + " )"
    token_parts = [f"{leg_blob} ILIKE %(tk{i})s" for i in range(len(tokens))]
    token_clauses_leg = f"AND ( {leg_blob} ILIKE %(p)s AND " + " AND ".join(token_parts) + " )"
    token_parts = [f"{stop_blob} ILIKE %(tk{i})s" for i in range(len(tokens))]
    token_clauses_stop = f"AND ( {stop_blob} ILIKE %(p)s AND " + " AND ".join(token_parts) + " )"

    sql = f"""
        WITH results AS (
            -- Trips
            SELECT
                'trip'::text AS type,
                t.id::text AS id,
                t.id AS sort_id,
                t.id AS entity_id,
                NULL::int AS trip_id,
                t.name AS title,
                t.description AS subtitle,
                t.start_date AS date,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN t.name ILIKE %(p)s THEN 'name' END,
                    CASE WHEN t.description ILIKE %(p)s THEN 'description' END,
                    CASE WHEN (t.start_date::text ILIKE %(p)s OR (%(mp)s IS NOT NULL AND t.start_date::text ILIKE %(mp)s)) THEN 'start_date' END,
                    CASE WHEN (t.end_date::text ILIKE %(p)s OR (%(mp)s IS NOT NULL AND t.end_date::text ILIKE %(mp)s)) THEN 'end_date' END
                ], NULL) AS matched_fields
            FROM trips t
            WHERE (
                t.name ILIKE %(p)s OR t.description ILIKE %(p)s OR
                t.start_date::text ILIKE %(p)s OR t.end_date::text ILIKE %(p)s OR
                (%(mp)s IS NOT NULL AND (t.start_date::text ILIKE %(mp)s OR t.end_date::text ILIKE %(mp)s))
            )
            {token_clauses_trip}

            UNION ALL
            -- Nodes
            SELECT
                'node'::text AS type,
                n.id::text AS id,
                n.id AS sort_id,
                n.id AS entity_id,
                n.trip_id AS trip_id,
                n.name AS title,
                COALESCE(NULLIF(n.description,''), NULLIF(n.notes,''), NULLIF(n.osm_name,'')) AS subtitle,
                COALESCE(n.arrival_date, n.departure_date) AS date,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN n.name ILIKE %(p)s THEN 'name' END,
                    CASE WHEN n.description ILIKE %(p)s THEN 'description' END,
                    CASE WHEN n.notes ILIKE %(p)s THEN 'notes' END,
                    CASE WHEN n.osm_name ILIKE %(p)s THEN 'osm_name' END,
                    CASE WHEN n.osm_country ILIKE %(p)s THEN 'osm_country' END,
                    CASE WHEN n.osm_state ILIKE %(p)s THEN 'osm_state' END,
                    CASE WHEN (n.arrival_date::text ILIKE %(p)s OR (%(mp)s IS NOT NULL AND n.arrival_date::text ILIKE %(mp)s)) THEN 'arrival_date' END,
                    CASE WHEN (n.departure_date::text ILIKE %(p)s OR (%(mp)s IS NOT NULL AND n.departure_date::text ILIKE %(mp)s)) THEN 'departure_date' END
                ], NULL) AS matched_fields
            FROM nodes n
            WHERE (n.invisible IS NOT TRUE) AND (
                n.name ILIKE %(p)s OR n.description ILIKE %(p)s OR n.notes ILIKE %(p)s OR
                n.osm_name ILIKE %(p)s OR n.osm_country ILIKE %(p)s OR n.osm_state ILIKE %(p)s OR
                n.arrival_date::text ILIKE %(p)s OR n.departure_date::text ILIKE %(p)s OR
                (%(mp)s IS NOT NULL AND (n.arrival_date::text ILIKE %(mp)s OR n.departure_date::text ILIKE %(mp)s))
            )
            {token_clauses_node}

            UNION ALL
            -- Legs
            SELECT
                'leg'::text AS type,
                l.id::text AS id,
                l.id AS sort_id,
                l.id AS entity_id,
                l.trip_id AS trip_id,
                                (COALESCE(ns.name, l.start_osm_name, 'Unknown') || ' → ' || COALESCE(ne.name, l.end_osm_name, 'Unknown')) AS title,
                                CASE
                                    WHEN l.type = 'flight' AND fd.airline IS NOT NULL THEN
                                        (fd.airline || COALESCE(' ' || fd.flight_number, '') || COALESCE(' (' || l.miles::int || ' mi)', ''))
                                    ELSE (l.type || COALESCE(' (' || l.miles::int || ' mi)', ''))
                                END AS subtitle,
                l.date AS date,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN l.notes ILIKE %(p)s THEN 'notes' END,
                    CASE WHEN l.type ILIKE %(p)s THEN 'type' END,
                    CASE WHEN l.start_osm_name ILIKE %(p)s THEN 'start_osm_name' END,
                    CASE WHEN l.end_osm_name ILIKE %(p)s THEN 'end_osm_name' END,
                    CASE WHEN l.start_osm_country ILIKE %(p)s THEN 'start_osm_country' END,
                    CASE WHEN l.end_osm_country ILIKE %(p)s THEN 'end_osm_country' END,
                    CASE WHEN l.start_osm_state ILIKE %(p)s THEN 'start_osm_state' END,
                                        CASE WHEN l.end_osm_state ILIKE %(p)s THEN 'end_osm_state' END,
                                        CASE WHEN (l.date::text ILIKE %(p)s OR (%(mp)s IS NOT NULL AND l.date::text ILIKE %(mp)s)) THEN 'date' END,
                                        CASE WHEN fd.airline ILIKE %(p)s THEN 'airline' END,
                                        CASE WHEN fd.flight_number ILIKE %(p)s THEN 'flight_number' END,
                                        CASE WHEN fd.start_airport ILIKE %(p)s THEN 'start_airport' END,
                                        CASE WHEN fd.end_airport ILIKE %(p)s THEN 'end_airport' END
                ], NULL) AS matched_fields
            FROM legs l
            LEFT JOIN nodes ns ON ns.id = l.start_node_id
            LEFT JOIN nodes ne ON ne.id = l.end_node_id
                        LEFT JOIN flight_details fd ON fd.leg_id = l.id
                        LEFT JOIN car_details cd ON cd.leg_id = l.id
            WHERE (
                l.notes ILIKE %(p)s OR l.type ILIKE %(p)s OR
                l.start_osm_name ILIKE %(p)s OR l.end_osm_name ILIKE %(p)s OR
                l.start_osm_country ILIKE %(p)s OR l.end_osm_country ILIKE %(p)s OR
                                l.start_osm_state ILIKE %(p)s OR l.end_osm_state ILIKE %(p)s OR
                                l.date::text ILIKE %(p)s OR
                                (%(mp)s IS NOT NULL AND l.date::text ILIKE %(mp)s) OR
                                fd.airline ILIKE %(p)s OR fd.flight_number ILIKE %(p)s OR
                                fd.start_airport ILIKE %(p)s OR fd.end_airport ILIKE %(p)s
            )
            {token_clauses_leg}

            UNION ALL
            -- Stops (use start_date/end_date; expose start_date as primary date for sorting)
            SELECT
                'stop'::text AS type,
                s.id::text AS id,
                s.id AS sort_id,
                s.id AS entity_id,
                s.trip_id AS trip_id,
                s.name AS title,
                s.category AS subtitle,
                s.start_date AS date,
                s.start_date AS start_date,
                s.end_date AS end_date,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN s.name ILIKE %(p)s THEN 'name' END,
                    CASE WHEN s.notes ILIKE %(p)s THEN 'notes' END,
                    CASE WHEN s.category ILIKE %(p)s THEN 'category' END,
                    CASE WHEN s.osm_name ILIKE %(p)s THEN 'osm_name' END,
                    CASE WHEN s.osm_country ILIKE %(p)s THEN 'osm_country' END,
                    CASE WHEN s.osm_state ILIKE %(p)s THEN 'osm_state' END,
                    CASE WHEN (s.start_date::text ILIKE %(p)s OR (%(mp)s IS NOT NULL AND s.start_date::text ILIKE %(mp)s)) THEN 'start_date' END,
                    CASE WHEN (s.end_date::text ILIKE %(p)s OR (%(mp)s IS NOT NULL AND s.end_date::text ILIKE %(mp)s)) THEN 'end_date' END
                ], NULL) AS matched_fields
        FROM stops s
            WHERE (
                s.name ILIKE %(p)s OR s.notes ILIKE %(p)s OR s.category ILIKE %(p)s OR
                s.osm_name ILIKE %(p)s OR s.osm_country ILIKE %(p)s OR s.osm_state ILIKE %(p)s OR
                s.start_date::text ILIKE %(p)s OR s.end_date::text ILIKE %(p)s OR
                (%(mp)s IS NOT NULL AND (s.start_date::text ILIKE %(mp)s OR s.end_date::text ILIKE %(mp)s))
        )
            {token_clauses_stop}
        )
        SELECT *
        FROM results
        ORDER BY COALESCE(array_length(matched_fields,1),0) DESC, date DESC NULLS LAST, title ASC
        LIMIT %(limit)s;
    """

    cur.execute(sql, params)
    rows = cur.fetchall() or []
    # Normalize Python side & gather trip associations
    results: List[dict] = []
    trip_ids_in_results: Set[int] = set()
    component_trip_ids: Set[int] = set()
    for r in rows:
        ent_id = r.get("entity_id")
        trip_id = r.get("trip_id")
        typ = r.get("type")
        rf = {
            "type": typ,
            "id": int(ent_id) if ent_id is not None else None,
            "trip_id": trip_id,
            "title": r.get("title"),
            "subtitle": r.get("subtitle"),
            "date": r.get("date"),
            "matched_fields": r.get("matched_fields") or [],
        }
        results.append(rf)
        if typ == 'trip' and ent_id is not None:
            trip_ids_in_results.add(int(ent_id))
        if typ in ('node','leg','stop') and trip_id is not None:
            component_trip_ids.add(trip_id)

    missing_trip_ids = sorted([tid for tid in component_trip_ids if tid not in trip_ids_in_results])
    if missing_trip_ids:
        cur.execute(
            """
            SELECT id, name, description, start_date, end_date
            FROM trips
            WHERE id = ANY(%s)
            """,
            (missing_trip_ids,)
        )
        trip_rows = cur.fetchall() or []
        for tr in trip_rows:
            results.append({
                "type": "trip",
                "id": tr["id"],
                "trip_id": None,
                "title": tr["name"],
                "subtitle": tr.get("description"),
                "date": tr.get("start_date"),
                "matched_fields": ["associated"],
            })

    cur.close(); conn.close()

    # Re-sort after adding associated trips
    def sort_key(obj):
        return (
            -(len(obj.get("matched_fields", [])) or 0),
            obj.get("date") if obj.get("date") is not None else None,
            obj.get("title") or ""
        )
    # Since Python can't sort descending on first and date desc easily with simple tuple, adjust:
    results.sort(key=lambda o: (
        - (len(o.get('matched_fields') or [])),
        o.get('date') is None,  # push None dates last
        o.get('date') if o.get('date') is None else -o['date'].toordinal() if hasattr(o.get('date'), 'toordinal') else o.get('date'),
        o.get('title') or ''
    ))

    return results
