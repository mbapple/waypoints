from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import re
import datetime as dt
import calendar as cal

from connect import get_db

router = APIRouter(prefix="/api/lists", tags=["lists"])

# ----------------------------- Models ----------------------------- #
class ListCreate(BaseModel):
    name: str
    match_type: str  # 'name' | 'osm_name' | 'osm_id' | 'date'
    items: Optional[str] = None  # comma separated raw string

class ListUpdate(BaseModel):
    name: Optional[str] = None
    match_type: Optional[str] = None
    items: Optional[str] = None  # comma separated raw string (replace full list)

class OverrideOp(BaseModel):
    item: str

VALID_MATCH_TYPES = {"name", "osm_name", "osm_id", "date", "osm_country", "osm_state"}

# ------------------------- Helpers ------------------------------- #

def _parse_items(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    # split on commas; allow newlines; trim
    parts = [p.strip() for p in re.split(r"[,\n]", raw) if p.strip()]
    # Deduplicate preserving order
    seen = set()
    dedup: List[str] = []
    for p in parts:
        if p.lower() not in seen:
            seen.add(p.lower())
            dedup.append(p)
    return dedup

_month_map = {
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

def _normalize_date_item(item: str) -> str:
    """Return canonical representation for date-based list entries.
    We allow forms like 'January 2025', '2025-01', '01/2025'.
    Canonical form: YYYY-MM (zero padded).
    If cannot parse a month-year, return original trimmed string (user may want a specific date?).
    """
    s = item.strip()
    if not s:
        return s
    # MonthName Year
    m = re.search(r"\b([A-Za-z]{3,9})\s+(20\d{2}|19\d{2})\b", s)
    if m:
        mon = _month_map.get(m.group(1).lower())
        if mon:
            return f"{int(m.group(2))}-{mon:02d}"
    # Year MonthName
    m = re.search(r"\b(20\d{2}|19\d{2})\s+([A-Za-z]{3,9})\b", s)
    if m:
        mon = _month_map.get(m.group(2).lower())
        if mon:
            return f"{int(m.group(1))}-{mon:02d}"
    # MM/YYYY or M/YYYY
    m = re.search(r"\b(0?\d|1[0-2])/(20\d{2}|19\d{2})\b", s)
    if m:
        mm = int(m.group(1))
        if 1 <= mm <= 12:
            return f"{int(m.group(2))}-{mm:02d}"
    # YYYY-MM or YYYY/M
    m = re.search(r"\b(20\d{2}|19\d{2})-(0?\d|1[0-2])\b", s)
    if m:
        mm = int(m.group(2))
        if 1 <= mm <= 12:
            return f"{int(m.group(1))}-{mm:02d}"
    return s  # fallback


def _canonicalize_items(match_type: str, items: List[str]) -> List[str]:
    if match_type == 'date':
        return [_normalize_date_item(i) for i in items]
    return items

# ----------------------------- CRUD ------------------------------ #

@router.post("/")
def create_list(payload: ListCreate):
    if payload.match_type not in VALID_MATCH_TYPES:
        raise HTTPException(status_code=400, detail="Invalid match_type")
    raw_items = _parse_items(payload.items)
    canon = _canonicalize_items(payload.match_type, raw_items)

    conn = get_db(); cur = conn.cursor()
    # Upsert-like behavior on name uniqueness? We'll just error if duplicate.
    try:
        cur.execute(
            """
            INSERT INTO lists (name, match_type, items)
            VALUES (%s, %s, %s)
            RETURNING id, name, match_type, items, manual_overrides, created_at, updated_at
            """,
            (payload.name, payload.match_type, canon)
        )
    except Exception as e:  # broad except to rollback
        conn.rollback(); cur.close(); conn.close()
        raise HTTPException(status_code=400, detail=f"Insert failed: {e}")
    row = cur.fetchone(); conn.commit(); cur.close(); conn.close()
    return row

@router.get("/")
def list_lists():
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id, name, match_type, items, manual_overrides, created_at, updated_at FROM lists ORDER BY name ASC")
    rows = cur.fetchall(); cur.close(); conn.close()
    return rows

@router.put("/{list_id}")
def update_list(list_id: int, payload: ListUpdate):
    # Collect fields
    updates = {}
    if payload.name is not None: updates['name'] = payload.name
    if payload.match_type is not None:
        if payload.match_type not in VALID_MATCH_TYPES:
            raise HTTPException(status_code=400, detail="Invalid match_type")
        updates['match_type'] = payload.match_type
    if payload.items is not None:
        raw_items = _parse_items(payload.items)
        mt = updates.get('match_type')
        if not mt:
            # need existing match_type
            conn = get_db(); cur = conn.cursor()
            cur.execute("SELECT match_type FROM lists WHERE id=%s", (list_id,))
            r = cur.fetchone(); cur.close(); conn.close()
            if not r:
                raise HTTPException(status_code=404, detail="List not found")
            mt = r['match_type']
        updates['items'] = _canonicalize_items(mt, raw_items)

    if not updates:
        raise HTTPException(status_code=400, detail="No updates supplied")

    set_clause = ", ".join([f"{k}=%s" for k in updates.keys()])
    params = list(updates.values()) + [list_id]
    conn = get_db(); cur = conn.cursor()
    cur.execute(f"UPDATE lists SET {set_clause} WHERE id=%s RETURNING id", params)
    row = cur.fetchone()
    if not row:
        conn.rollback(); cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="List not found")
    conn.commit(); cur.close(); conn.close()
    return {"message": f"List {list_id} updated"}

@router.delete("/{list_id}")
def delete_list(list_id: int):
    conn = get_db(); cur = conn.cursor()
    cur.execute("DELETE FROM lists WHERE id=%s RETURNING id", (list_id,))
    r = cur.fetchone()
    if not r:
        conn.rollback(); cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="List not found")
    conn.commit(); cur.close(); conn.close()
    return {"message": f"List {list_id} deleted"}

# --------------------- Manual overrides ops --------------------- #

@router.post("/{list_id}/overrides")
def add_override(list_id: int, op: OverrideOp):
    item = op.item.strip()
    if not item:
        raise HTTPException(status_code=400, detail="Empty item")
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT manual_overrides FROM lists WHERE id=%s", (list_id,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close(); raise HTTPException(status_code=404, detail="List not found")
    overrides = row['manual_overrides'] or []
    if item not in overrides:
        overrides.append(item)
    cur.execute("UPDATE lists SET manual_overrides=%s WHERE id=%s", (overrides, list_id))
    conn.commit(); cur.close(); conn.close()
    return {"manual_overrides": overrides}

@router.delete("/{list_id}/overrides")
def remove_override(list_id: int, item: str = Query(..., description="Item to remove")):
    it = item.strip()
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT manual_overrides FROM lists WHERE id=%s", (list_id,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close(); raise HTTPException(status_code=404, detail="List not found")
    overrides = row['manual_overrides'] or []
    new_overrides = [o for o in overrides if o != it]
    cur.execute("UPDATE lists SET manual_overrides=%s WHERE id=%s", (new_overrides, list_id))
    conn.commit(); cur.close(); conn.close()
    return {"manual_overrides": new_overrides}

# ------------------------ Matching logic ------------------------ #

def _fetch_list(list_id: int) -> Dict[str, Any]:
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id, name, match_type, items, manual_overrides, created_at, updated_at FROM lists WHERE id=%s", (list_id,))
    row = cur.fetchone(); cur.close(); conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="List not found")
    return row

# Build query fragments per type
ENTITY_SPECS = {
    'nodes': {
        'table': 'nodes',
        'id_col': 'id',
        'name_cols': ['name', 'osm_name'],
        'osm_id_col': 'osm_id',
        'date_cols': ['arrival_date', 'departure_date']
    },
    'stops': {
        'table': 'stops',
        'id_col': 'id',
        'name_cols': ['name', 'osm_name'],
        'osm_id_col': 'osm_id',
        'date_cols': ['start_date', 'end_date']
    },
    'adventures': {
        'table': 'adventures',
        'id_col': 'id',
        'name_cols': ['name', 'osm_name'],
        'osm_id_col': 'osm_id',
        'date_cols': ['start_date', 'end_date']
    }
}

@router.get("/{list_id}")
def get_list_with_matches(list_id: int):
    lst = _fetch_list(list_id)
    match_type = lst['match_type']
    items: List[str] = lst['items'] or []
    overrides: List[str] = lst['manual_overrides'] or []

    # Prepare canonical items for date matching (already canonicalized on storage)
    # Build results structure
    matches_summary = []  # each: { item, matched: bool, auto_match_count, override }
    item_to_entities: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}

    conn = get_db(); cur = conn.cursor()

    # We'll fetch all potential entities once per entity type depending on match_type to reduce round trips
    def build_regex(pattern: str) -> str:
        # simple escape of special chars except wildcards; treat pattern as literal segment inside case-insensitive search
        # For name/osm_name we treat item as regex directly if it contains regex meta chars; allow user advanced patterns.
        return pattern

    if match_type in ('name','osm_name'):
        # Build combined regex OR for efficiency; but we also want per-item matching, so we fetch wide result set then bucket.
        regexes = [build_regex(it) for it in items]
        # Compose broad filter: any of the patterns matches name/osm_name
        if regexes:
            # Build OR chains explicitly outside of the SQL literal so they aren't treated as text.
            name_col = 'name' if match_type=='name' else 'osm_name'
            node_clauses = [f"n.{name_col} ~* %s" for _ in regexes]
            node_clause_str = " OR ".join(node_clauses)
            sql = f"""
                SELECT 'nodes' AS entity_type, n.id, n.name, n.osm_name, n.{name_col} AS target,
                       n.arrival_date AS start_date, n.departure_date AS end_date,
                       n.trip_id, t.name AS trip_name
                FROM nodes n
                LEFT JOIN trips t ON t.id = n.trip_id
                WHERE (n.invisible IS NOT TRUE) AND ({node_clause_str})
            """
            params = regexes
            cur.execute(sql, params); node_rows = cur.fetchall() or []

            stop_clauses = [f"s.{name_col} ~* %s" for _ in regexes]
            stop_clause_str = " OR ".join(stop_clauses)
            sql = f"""
                SELECT 'stops' AS entity_type, s.id, s.name, s.osm_name, s.{name_col} AS target,
                       s.start_date AS start_date, s.end_date AS end_date,
                       s.trip_id, t.name AS trip_name
                FROM stops s
                LEFT JOIN trips t ON t.id = s.trip_id
                WHERE {stop_clause_str}
            """
            cur.execute(sql, params); stop_rows = cur.fetchall() or []

            adv_clauses = [f"a.{name_col} ~* %s" for _ in regexes]
            adv_clause_str = " OR ".join(adv_clauses)
            sql = f"""
                SELECT 'adventures' AS entity_type, a.id, a.name, a.osm_name, a.{name_col} AS target,
                       a.start_date AS start_date, a.end_date AS end_date
                FROM adventures a
                WHERE {adv_clause_str}
            """
            cur.execute(sql, params); adv_rows = cur.fetchall() or []
        else:
            node_rows = stop_rows = adv_rows = []
        # Bucket per item
        for it in items:
            pattern = re.compile(it, re.IGNORECASE)
            item_to_entities[it] = {"nodes": [], "stops": [], "adventures": []}
            for r in node_rows:
                if pattern.search(r['target'] or ''):
                    item_to_entities[it]['nodes'].append(r)
            for r in stop_rows:
                if pattern.search(r['target'] or ''):
                    item_to_entities[it]['stops'].append(r)
            for r in adv_rows:
                if pattern.search(r['target'] or ''):
                    item_to_entities[it]['adventures'].append(r)

    elif match_type == 'osm_id':
        # direct equality vs any OSM id field
        if items:
            cur.execute("""
                SELECT 'nodes' AS entity_type, n.id, n.name, n.osm_name, n.osm_id,
                       n.arrival_date AS start_date, n.departure_date AS end_date,
                       n.trip_id, t.name AS trip_name
                FROM nodes n
                LEFT JOIN trips t ON t.id = n.trip_id
                WHERE (n.invisible IS NOT TRUE) AND n.osm_id = ANY(%s)
            """, (items,))
            node_rows = cur.fetchall() or []
            cur.execute("""
                SELECT 'stops' AS entity_type, s.id, s.name, s.osm_name, s.osm_id,
                       s.start_date, s.end_date,
                       s.trip_id, t.name AS trip_name
                FROM stops s
                LEFT JOIN trips t ON t.id = s.trip_id
                WHERE s.osm_id = ANY(%s)
            """, (items,))
            stop_rows = cur.fetchall() or []
            cur.execute("""
                SELECT 'adventures' AS entity_type, a.id, a.name, a.osm_name, a.osm_id,
                       a.start_date, a.end_date
                FROM adventures a
                WHERE a.osm_id = ANY(%s)
            """, (items,))
            adv_rows = cur.fetchall() or []
        else:
            node_rows = stop_rows = adv_rows = []
        for it in items:
            item_to_entities[it] = {"nodes": [], "stops": [], "adventures": []}
            for r in node_rows:
                if r.get('osm_id') == it:
                    item_to_entities[it]['nodes'].append(r)
            for r in stop_rows:
                if r.get('osm_id') == it:
                    item_to_entities[it]['stops'].append(r)
            for r in adv_rows:
                if r.get('osm_id') == it:
                    item_to_entities[it]['adventures'].append(r)

    elif match_type == 'date':
        # items are canonical YYYY-MM; match any entity whose any date col falls within that month
        # We'll fetch by month boundaries.
        for it in items:
            item_to_entities[it] = {"nodes": [], "stops": [], "adventures": []}
            if re.fullmatch(r"20\d{2}-\d{2}", it):
                year, month = map(int, it.split('-'))
                start = dt.date(year, month, 1)
                end = dt.date(year, month, cal.monthrange(year, month)[1])
                # Nodes
                cur.execute("""
                    SELECT 'nodes' AS entity_type, n.id, n.name, n.osm_name, n.arrival_date AS start_date, n.departure_date AS end_date,
                           n.trip_id, t.name AS trip_name
                    FROM nodes n
                    LEFT JOIN trips t ON t.id = n.trip_id
                    WHERE (n.invisible IS NOT TRUE) AND (
                        (n.arrival_date BETWEEN %s AND %s) OR (n.departure_date BETWEEN %s AND %s)
                        OR (n.arrival_date <= %s AND n.departure_date >= %s)
                    )
                """, (start, end, start, end, start, end))
                item_to_entities[it]['nodes'] = cur.fetchall() or []
                # Stops
                cur.execute("""
                    SELECT 'stops' AS entity_type, s.id, s.name, s.osm_name, s.start_date, s.end_date,
                           s.trip_id, t.name AS trip_name
                    FROM stops s
                    LEFT JOIN trips t ON t.id = s.trip_id
                    WHERE (
                        (s.start_date BETWEEN %s AND %s) OR (s.end_date BETWEEN %s AND %s)
                        OR (s.start_date <= %s AND s.end_date >= %s)
                    )
                """, (start, end, start, end, start, end))
                item_to_entities[it]['stops'] = cur.fetchall() or []
                # Adventures (no trip linkage)
                cur.execute("""
                    SELECT 'adventures' AS entity_type, a.id, a.name, a.osm_name, a.start_date, a.end_date
                    FROM adventures a
                    WHERE (
                        (a.start_date BETWEEN %s AND %s) OR (a.end_date BETWEEN %s AND %s)
                        OR (a.start_date <= %s AND a.end_date >= %s)
                    )
                """, (start, end, start, end, start, end))
                item_to_entities[it]['adventures'] = cur.fetchall() or []
            else:
                # Non-parsable, skip automatic matches
                pass

    elif match_type in ('osm_country','osm_state'):
        col = 'osm_country' if match_type == 'osm_country' else 'osm_state'
        if items:
            lowered = [it.lower() for it in items]
            cur2 = get_db(); cur_local = cur2.cursor()  # separate cursor not needed but keeping pattern simple
            # Use existing cursor instead of new connection actually
            cur_local = cur  # reuse
            # Nodes
            cur_local.execute(f"""
                SELECT 'nodes' AS entity_type, n.id, n.name, n.osm_name, n.arrival_date AS start_date, n.departure_date AS end_date,
                       n.trip_id, t.name AS trip_name, LOWER(n.{col}) AS target
                FROM nodes n
                LEFT JOIN trips t ON t.id = n.trip_id
                WHERE (n.invisible IS NOT TRUE) AND n.{col} IS NOT NULL AND LOWER(n.{col}) = ANY(%s)
            """, (lowered,))
            node_rows = cur_local.fetchall() or []
            # Stops
            cur_local.execute(f"""
                SELECT 'stops' AS entity_type, s.id, s.name, s.osm_name, s.start_date, s.end_date,
                       s.trip_id, t.name AS trip_name, LOWER(s.{col}) AS target
                FROM stops s
                LEFT JOIN trips t ON t.id = s.trip_id
                WHERE s.{col} IS NOT NULL AND LOWER(s.{col}) = ANY(%s)
            """, (lowered,))
            stop_rows = cur_local.fetchall() or []
        else:
            node_rows = stop_rows = []
        for it in items:
            key = it.lower()
            item_to_entities.setdefault(it, {"nodes": [], "stops": [], "adventures": []})
            for r in node_rows:
                if r.get('target') == key:
                    item_to_entities[it]['nodes'].append(r)
            for r in stop_rows:
                if r.get('target') == key:
                    item_to_entities[it]['stops'].append(r)

    cur.close(); conn.close()

    # Build matches summary
    for it in items:
        ent = item_to_entities.get(it, {"nodes": [], "stops": [], "adventures": []})
        auto_count = sum(len(v) for v in ent.values())
        matches_summary.append({
            "item": it,
            "auto_match_count": auto_count,
            "matched": auto_count > 0 or it in overrides,
            "override": it in overrides
        })

    response = {
        "list": {
            "id": lst['id'],
            "name": lst['name'],
            "match_type": match_type,
            "items": items,
            "manual_overrides": overrides,
            "created_at": lst['created_at'],
            "updated_at": lst['updated_at']
        },
        "summary": matches_summary,
        "entities": item_to_entities
    }
    return response
