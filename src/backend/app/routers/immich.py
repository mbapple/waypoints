"""Immich integration: browse photos in Immich and link them to trips and adventures.

Every request to Immich is made here, server-side, with IMMICH_URL and
IMMICH_API_KEY from .env. The browser never talks to Immich: it lists assets
through this router, loads images through the image proxy below, and linked
photos are stored with a URL that points at that proxy, not at Immich.
"""
import json
import re
import urllib.error
import urllib.request
from datetime import datetime, time, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

import config
from .connect import get_db

router = APIRouter(prefix="/api/integrations/immich", tags=["immich"])

IMMICH_TIMEOUT_SECONDS = 20
SEARCH_PAGE_SIZE = 250
MAX_ASSETS = 5000  # safety cap for very long trips / huge libraries
IMAGE_SIZES = {"thumbnail", "preview"}
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

# Photo link targets -> table holding their trip_id. Fixed mapping, never user input.
TARGET_TABLES = {"node_id": "nodes", "leg_id": "legs", "stop_id": "stops"}


def _is_configured() -> bool:
    return bool(config.IMMICH_URL and config.IMMICH_API_KEY)


def _check_asset_id(asset_id: str) -> str:
    asset_id = asset_id.lower()
    if not UUID_RE.match(asset_id):
        raise HTTPException(status_code=400, detail="Invalid Immich asset id")
    return asset_id


def _immich(method: str, path: str, body: Optional[dict] = None, accept: str = "application/json"):
    """Call the Immich API and return (body bytes, content type)."""
    if not _is_configured():
        raise HTTPException(status_code=503, detail="Immich is not configured (set IMMICH_URL and IMMICH_API_KEY in .env)")

    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"x-api-key": config.IMMICH_API_KEY, "Accept": accept}
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(f"{config.IMMICH_URL}/api{path}", data=data, method=method, headers=headers)

    try:
        with urllib.request.urlopen(request, timeout=IMMICH_TIMEOUT_SECONDS) as resp:
            return resp.read(), resp.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise HTTPException(status_code=404, detail="Not found in Immich")
        if e.code in (401, 403):
            raise HTTPException(status_code=502, detail="Immich rejected the API key (check IMMICH_API_KEY and its permissions)")
        message = ""
        try:
            payload = json.loads(e.read().decode("utf-8"))
            message = payload.get("message") or ""
            if isinstance(message, list):
                message = "; ".join(str(m) for m in message)
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"Immich error {e.code}{': ' + message if message else ''}")
    except (urllib.error.URLError, TimeoutError):
        raise HTTPException(status_code=502, detail="Could not reach Immich (check IMMICH_URL)")


def _immich_json(method: str, path: str, body: Optional[dict] = None):
    raw, _ = _immich(method, path, body)
    try:
        return json.loads(raw.decode("utf-8"))
    except ValueError:
        raise HTTPException(status_code=502, detail="Invalid response from Immich")


def _trip_date_range(cur, trip_id: int):
    """Trip start/end dates, falling back to the itinerary's dates when unset."""
    cur.execute("SELECT start_date, end_date FROM trips WHERE id = %s", (trip_id,))
    trip = cur.fetchone()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    start, end = trip["start_date"], trip["end_date"]
    if start is None or end is None:
        cur.execute(
            """
            SELECT MIN(d) AS lo, MAX(d) AS hi FROM (
                SELECT arrival_date AS d FROM nodes WHERE trip_id = %s
                UNION ALL SELECT departure_date FROM nodes WHERE trip_id = %s
                UNION ALL SELECT date FROM legs WHERE trip_id = %s
                UNION ALL SELECT start_date FROM stops WHERE trip_id = %s
                UNION ALL SELECT end_date FROM stops WHERE trip_id = %s
            ) AS itinerary_dates
            """,
            (trip_id,) * 5,
        )
        row = cur.fetchone()
        start = start or row["lo"]
        end = end or row["hi"]
    if start is None or end is None:
        raise HTTPException(status_code=400, detail="Trip has no dates, so its Immich photos can't be found")
    if end < start:
        start, end = end, start
    return start, end


def _local_taken_at(asset: dict) -> Optional[str]:
    """Capture time in the photo's local time zone, as 'YYYY-MM-DDTHH:MM:SS'.

    Immich's localDateTime is local wall-clock time (serialized with a 'Z'
    suffix that should be ignored), which is what trip dates are in.
    """
    value = asset.get("localDateTime") or asset.get("fileCreatedAt")
    if not value or len(value) < 10:
        return None
    return value[:19]


def _asset_summary(asset: dict, linked_ids: set) -> Optional[dict]:
    asset_id = str(asset.get("id") or "").lower()
    if not UUID_RE.match(asset_id):
        return None
    taken_at = _local_taken_at(asset)
    exif = asset.get("exifInfo") or {}
    return {
        "id": asset_id,
        "taken_at": taken_at,
        "date": taken_at[:10] if taken_at else None,
        "latitude": exif.get("latitude"),
        "longitude": exif.get("longitude"),
        "city": exif.get("city"),
        "state": exif.get("state"),
        "country": exif.get("country"),
        "filename": asset.get("originalFileName"),
        "linked": asset_id in linked_ids,
        "thumbnail_url": f"{router.prefix}/assets/{asset_id}/thumbnail",
        "preview_url": f"{router.prefix}/assets/{asset_id}/preview",
    }


def _adventure_date_range(cur, adventure_id: int):
    cur.execute("SELECT start_date, end_date FROM adventures WHERE id = %s", (adventure_id,))
    adv = cur.fetchone()
    if not adv:
        raise HTTPException(status_code=404, detail="Adventure not found")
    start = adv["start_date"] or adv["end_date"]
    end = adv["end_date"] or adv["start_date"]
    if start is None:
        raise HTTPException(status_code=400, detail="Adventure has no dates, so its Immich photos can't be found")
    if end < start:
        start, end = end, start
    return start, end


def _linked_asset_ids(cur, column: str, owner_id: int) -> set:
    # column comes from a fixed set ("trip_id" / "adventure_id"), never user input
    cur.execute(
        f"SELECT immich_asset_id FROM photos WHERE {column} = %s AND immich_asset_id IS NOT NULL",
        (owner_id,),
    )
    return {r["immich_asset_id"] for r in cur.fetchall()}


def _list_assets(owner_column: str, owner_id: int, date_range_fn):
    """Immich images whose local capture date is within the owner's dates."""
    if not _is_configured():
        raise HTTPException(status_code=503, detail="Immich is not configured (set IMMICH_URL and IMMICH_API_KEY in .env)")

    conn = get_db()
    try:
        cur = conn.cursor()
        start, end = date_range_fn(cur, owner_id)
        linked_ids = _linked_asset_ids(cur, owner_column, owner_id)
        cur.close()
    finally:
        conn.close()

    # Immich filters on UTC capture time. Pad a day on each side to cover any
    # time zone, then keep photos whose *local* capture date is within range.
    taken_after = datetime.combine(start - timedelta(days=1), time.min).isoformat() + "Z"
    taken_before = datetime.combine(end + timedelta(days=2), time.min).isoformat() + "Z"

    raw_assets = []
    truncated = False
    page = 1
    while page:
        data = _immich_json("POST", "/search/metadata", {
            "takenAfter": taken_after,
            "takenBefore": taken_before,
            "type": "IMAGE",
            "withExif": True,
            "order": "asc",
            "page": page,
            "size": SEARCH_PAGE_SIZE,
        })
        assets = data.get("assets") or {}
        raw_assets.extend(assets.get("items") or [])
        next_page = assets.get("nextPage")
        if len(raw_assets) >= MAX_ASSETS:
            truncated = bool(next_page)
            break
        try:
            page = int(next_page) if next_page else None
        except (TypeError, ValueError):
            page = None

    start_s, end_s = start.isoformat(), end.isoformat()
    results = []
    for asset in raw_assets:
        summary = _asset_summary(asset, linked_ids)
        if summary and summary["date"] and start_s <= summary["date"] <= end_s:
            results.append(summary)
    results.sort(key=lambda a: a["taken_at"] or "")

    return {"start_date": start_s, "end_date": end_s, "truncated": truncated, "assets": results}


@router.get("/trips/{trip_id}/assets")
def list_trip_assets(trip_id: int):
    """Immich photos taken during the trip (local capture date within the trip's dates)."""
    return _list_assets("trip_id", trip_id, _trip_date_range)


@router.get("/adventures/{adventure_id}/assets")
def list_adventure_assets(adventure_id: int):
    """Immich photos taken during the adventure (local capture date within its dates)."""
    return _list_assets("adventure_id", adventure_id, _adventure_date_range)


@router.get("/assets/{asset_id}/{size}")
def asset_image(asset_id: str, size: str):
    """Proxy an Immich thumbnail ('thumbnail', small) or 'preview' (large) image."""
    asset_id = _check_asset_id(asset_id)
    if size not in IMAGE_SIZES:
        raise HTTPException(status_code=404, detail="Unknown image size")
    body, content_type = _immich("GET", f"/assets/{asset_id}/thumbnail?size={size}", accept="image/*")
    return Response(
        content=body,
        media_type=content_type or "image/jpeg",
        headers={"Cache-Control": "private, max-age=86400"},
    )


class LinkRequest(BaseModel):
    asset_id: str
    # Exactly one of trip_id / adventure_id
    trip_id: Optional[int] = None
    adventure_id: Optional[int] = None
    # Trip links only: optionally attach to one of the trip's items
    node_id: Optional[int] = None
    leg_id: Optional[int] = None
    stop_id: Optional[int] = None
    description: Optional[str] = None


@router.post("/link")
def link_asset(req: LinkRequest):
    """Link an Immich photo to a trip (optionally one of its nodes, legs or stops) or an adventure.

    The photo is not copied: it's stored with a URL pointing at the image proxy.
    """
    asset_id = _check_asset_id(req.asset_id)
    if (req.trip_id is None) == (req.adventure_id is None):
        raise HTTPException(status_code=400, detail="Provide exactly one of trip_id or adventure_id")
    targets = {k: v for k, v in (("node_id", req.node_id), ("leg_id", req.leg_id), ("stop_id", req.stop_id)) if v is not None}
    if req.adventure_id is not None and targets:
        raise HTTPException(status_code=400, detail="Adventure photos can't be linked to a node, leg or stop")
    if len(targets) > 1:
        raise HTTPException(status_code=400, detail="Link to at most one of node_id, leg_id or stop_id")

    asset = _immich_json("GET", f"/assets/{asset_id}")
    if asset.get("type") != "IMAGE":
        raise HTTPException(status_code=400, detail="Only Immich images can be linked")

    if req.trip_id is not None:
        owner_column, owner_id, owner_table, owner_label = "trip_id", req.trip_id, "trips", "trip"
    else:
        owner_column, owner_id, owner_table, owner_label = "adventure_id", req.adventure_id, "adventures", "adventure"

    conn = get_db()
    try:
        cur = conn.cursor()
        # owner_table / owner_column / TARGET_TABLES values are fixed strings, never user input
        cur.execute(f"SELECT 1 FROM {owner_table} WHERE id = %s", (owner_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail=f"{owner_label.capitalize()} not found")
        for column, target_id in targets.items():
            cur.execute(f"SELECT trip_id FROM {TARGET_TABLES[column]} WHERE id = %s", (target_id,))
            row = cur.fetchone()
            if not row or row["trip_id"] != req.trip_id:
                raise HTTPException(status_code=400, detail=f"{column} {target_id} does not belong to this trip")
        if asset_id in _linked_asset_ids(cur, owner_column, owner_id):
            raise HTTPException(status_code=409, detail=f"This Immich photo is already linked to the {owner_label}")

        url_path = f"{router.prefix}/assets/{asset_id}/preview"
        cur.execute(
            """
            INSERT INTO photos (trip_id, adventure_id, leg_id, node_id, stop_id, url, description, immich_asset_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (req.trip_id, req.adventure_id, req.leg_id, req.node_id, req.stop_id, url_path, req.description, asset_id),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {"id": row["id"], "url": url_path, "immich_asset_id": asset_id}
