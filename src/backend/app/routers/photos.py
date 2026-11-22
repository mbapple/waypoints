from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import date, datetime
import os
import shutil
import struct
import uuid

import config
from .connect import get_db
from . import immich

router = APIRouter(prefix="/api/photos", tags=["photos"])

UPLOAD_DIR = config.UPLOAD_DIR
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

os.makedirs(UPLOAD_DIR, exist_ok=True)


def _allowed(filename: str) -> bool:
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in ALLOWED_EXTENSIONS


# EXIF tags holding capture times, best first. All are local wall-clock time.
EXIF_IFD_POINTER = 0x8769
EXIF_DATE_TAGS = (0x9003, 0x9004)  # DateTimeOriginal, DateTimeDigitized (in the Exif IFD)
IFD0_DATE_TAG = 0x0132             # DateTime (in IFD0)


def _tiff_taken_at(tiff: bytes) -> Optional[datetime]:
    """Capture time from a TIFF/EXIF block, or None."""
    if tiff[:2] == b"II":
        order = "<"
    elif tiff[:2] == b"MM":
        order = ">"
    else:
        return None

    def u16(offset):
        return struct.unpack_from(order + "H", tiff, offset)[0]

    def u32(offset):
        return struct.unpack_from(order + "I", tiff, offset)[0]

    def read_ifd(offset):
        entries = {}
        for i in range(u16(offset)):
            pos = offset + 2 + i * 12
            # tag -> (type, count, offset of the value/pointer field)
            entries[u16(pos)] = (u16(pos + 2), u32(pos + 4), pos + 8)
        return entries

    def ascii_value(entry):
        typ, count, field = entry
        if typ != 2:  # ASCII
            return None
        start = field if count <= 4 else u32(field)
        return tiff[start:start + count].split(b"\0")[0].decode("ascii", "ignore")

    try:
        ifd0 = read_ifd(u32(4))
        candidates = []
        if EXIF_IFD_POINTER in ifd0:
            exif_ifd = read_ifd(u32(ifd0[EXIF_IFD_POINTER][2]))
            candidates += [ascii_value(exif_ifd[t]) for t in EXIF_DATE_TAGS if t in exif_ifd]
        if IFD0_DATE_TAG in ifd0:
            candidates.append(ascii_value(ifd0[IFD0_DATE_TAG]))
    except (struct.error, IndexError):
        return None

    for value in candidates:
        try:
            return datetime.strptime((value or "").strip()[:19], "%Y:%m:%d %H:%M:%S")
        except ValueError:
            continue
    return None


def _exif_taken_at(path: str) -> Optional[datetime]:
    """Capture time from a JPEG's EXIF data, or None (other formats, no EXIF, unreadable)."""
    try:
        with open(path, "rb") as f:
            data = f.read(256 * 1024)  # EXIF (APP1) sits near the start and is at most 64KB
    except OSError:
        return None
    if data[:2] != b"\xff\xd8":
        return None
    pos = 2
    while pos + 4 <= len(data) and data[pos] == 0xFF:
        marker = data[pos + 1]
        if marker == 0xDA:  # start of scan: no more metadata segments
            break
        length = struct.unpack_from(">H", data, pos + 2)[0]
        segment = data[pos + 4:pos + 2 + length]
        if marker == 0xE1 and segment[:6] == b"Exif\0\0":
            return _tiff_taken_at(segment[6:])
        pos += 2 + length
    return None


def _upload_path(url: str) -> Optional[str]:
    if url and url.startswith("/uploads/"):
        return os.path.join(UPLOAD_DIR, os.path.basename(url))
    return None


@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    trip_id: Optional[int] = Form(None),
    leg_id: Optional[int] = Form(None),
    node_id: Optional[int] = Form(None),
    stop_id: Optional[int] = Form(None),
    adventure_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None)
):
    if not (trip_id or leg_id or node_id or stop_id or adventure_id):
        raise HTTPException(status_code=400, detail="One of trip_id, leg_id, node_id, stop_id, or adventure_id must be provided")

    if not _allowed(file.filename):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Read a chunk to enforce size limit
    size = 0
    tmp_path = os.path.join(UPLOAD_DIR, f"tmp_{uuid.uuid4().hex}")
    with open(tmp_path, 'wb') as tmp:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                tmp.close()
                os.remove(tmp_path)
                raise HTTPException(status_code=413, detail="File too large")
            tmp.write(chunk)

    # Final file name under uploads
    ext = file.filename.rsplit('.', 1)[-1].lower()
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    final_path = os.path.join(UPLOAD_DIR, safe_name)
    shutil.move(tmp_path, final_path)

    # URL exposed via StaticFiles
    url_path = f"/uploads/{safe_name}"

    # Derive trip_id if missing
    conn = get_db()
    cur = conn.cursor()
    if trip_id is None:
        if leg_id is not None:
            cur.execute("SELECT trip_id FROM legs WHERE id = %s", (leg_id,))
            row = cur.fetchone()
            if row and row["trip_id"] is not None:
                trip_id = row["trip_id"]
        if trip_id is None and node_id is not None:
            cur.execute("SELECT trip_id FROM nodes WHERE id = %s", (node_id,))
            row = cur.fetchone()
            if row and row["trip_id"] is not None:
                trip_id = row["trip_id"]
        if trip_id is None and stop_id is not None:
            cur.execute("SELECT trip_id FROM stops WHERE id = %s", (stop_id,))
            row = cur.fetchone()
            if row and row["trip_id"] is not None:
                trip_id = row["trip_id"]
        # adventures not tied to a trip, so no derivation
    cur.execute(
        """
        INSERT INTO photos (trip_id, leg_id, node_id, stop_id, adventure_id, url, description, taken_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (trip_id, leg_id, node_id, stop_id, adventure_id, url_path, description, _exif_taken_at(final_path))
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {"id": row["id"], "url": url_path}


CALENDAR_MAX_DAYS = 120
BACKFILL_LIMIT = 200  # photos per request whose taken_at is looked up


def _backfill_taken_at(cur, start: date, end: date) -> None:
    """Fill photos.taken_at for photos of trips/adventures overlapping [start, end].

    Uploads are read for EXIF, Immich photos are looked up in Immich. Photos with
    no capture time stay NULL and are retried next time (EXIF reads are cheap;
    Immich lookups stop for this request at the first connection/config error).
    """
    cur.execute(
        """
        SELECT p.id, p.url, p.immich_asset_id
        FROM photos p
        LEFT JOIN trips t ON t.id = p.trip_id
        LEFT JOIN adventures a ON a.id = p.adventure_id
        WHERE p.taken_at IS NULL
          AND (
            (LEAST(t.start_date, t.end_date) <= %(end)s AND GREATEST(t.start_date, t.end_date) >= %(start)s)
            OR (LEAST(a.start_date, a.end_date) <= %(end)s AND GREATEST(a.start_date, a.end_date) >= %(start)s)
          )
        ORDER BY p.id
        LIMIT %(limit)s
        """,
        {"start": start, "end": end, "limit": BACKFILL_LIMIT},
    )
    immich_ok = immich._is_configured()
    for row in cur.fetchall():
        taken_at = None
        if row["immich_asset_id"]:
            if not immich_ok:
                continue
            try:
                taken_at = immich.asset_taken_at(row["immich_asset_id"])
            except HTTPException as e:
                if e.status_code not in (400, 404):  # Immich unreachable / misconfigured
                    immich_ok = False
                continue
        else:
            path = _upload_path(row["url"])
            taken_at = _exif_taken_at(path) if path else None
        if taken_at:
            cur.execute("UPDATE photos SET taken_at = %s WHERE id = %s", (taken_at, row["id"]))


@router.get("/calendar")
def calendar_photos(start: date = Query(...), end: date = Query(...)):
    """One random trip/adventure photo per day between start and end (inclusive).

    A photo's day is its capture date (taken_at). Photos without one fall back to
    the date of the stop/node/leg they're attached to, or to their trip's or
    adventure's date when that is a single day.
    """
    if end < start:
        raise HTTPException(status_code=400, detail="end must not be before start")
    if (end - start).days > CALENDAR_MAX_DAYS:
        raise HTTPException(status_code=400, detail=f"Range is limited to {CALENDAR_MAX_DAYS} days")

    conn = get_db()
    try:
        cur = conn.cursor()
        _backfill_taken_at(cur, start, end)
        conn.commit()
        cur.execute(
            """
            WITH dated AS (
                SELECT p.id, p.url, p.description, p.immich_asset_id, p.adventure_id,
                       COALESCE(p.trip_id, s.trip_id, n.trip_id, l.trip_id) AS trip_id,
                       COALESCE(
                           p.taken_at::date,
                           s.start_date, n.arrival_date, n.departure_date, l.date,
                           CASE WHEN a.start_date IS NULL OR a.end_date IS NULL OR a.start_date = a.end_date
                                THEN COALESCE(a.start_date, a.end_date) END,
                           CASE WHEN t.start_date = t.end_date THEN t.start_date END
                       ) AS photo_date
                FROM photos p
                LEFT JOIN stops s ON s.id = p.stop_id
                LEFT JOIN nodes n ON n.id = p.node_id
                LEFT JOIN legs l ON l.id = p.leg_id
                LEFT JOIN adventures a ON a.id = p.adventure_id
                LEFT JOIN trips t ON t.id = COALESCE(p.trip_id, s.trip_id, n.trip_id, l.trip_id)
            )
            SELECT DISTINCT ON (d.photo_date)
                   d.photo_date, d.id, d.url, d.description, d.immich_asset_id, d.trip_id, d.adventure_id,
                   t.name AS trip_name, a.name AS adventure_name,
                   COUNT(*) OVER (PARTITION BY d.photo_date) AS day_count
            FROM dated d
            LEFT JOIN trips t ON t.id = d.trip_id
            LEFT JOIN adventures a ON a.id = d.adventure_id
            WHERE d.photo_date BETWEEN %s AND %s
              AND (d.trip_id IS NOT NULL OR d.adventure_id IS NOT NULL)
            ORDER BY d.photo_date, random()
            """,
            (start, end),
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()

    return [
        {
            "date": r["photo_date"].isoformat(),
            "id": r["id"],
            "url": r["url"],
            "thumbnail_url": immich.thumbnail_url(r["immich_asset_id"]) if r["immich_asset_id"] else r["url"],
            "description": r["description"],
            "trip_id": r["trip_id"],
            "trip_name": r["trip_name"],
            "adventure_id": r["adventure_id"],
            "adventure_name": r["adventure_name"],
            "day_count": r["day_count"],
        }
        for r in rows
    ]


@router.get("/by_trip/{trip_id}")
def list_photos_by_trip(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, url, description, leg_id, node_id, stop_id, adventure_id FROM photos WHERE trip_id = %s ORDER BY id DESC", (trip_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


@router.get("/by_leg/{leg_id}")
def list_photos_by_leg(leg_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, url, description, trip_id, node_id, stop_id, adventure_id FROM photos WHERE leg_id = %s ORDER BY id DESC", (leg_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


@router.get("/by_node/{node_id}")
def list_photos_by_node(node_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, url, description, trip_id, leg_id, stop_id, adventure_id FROM photos WHERE node_id = %s ORDER BY id DESC", (node_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


@router.get("/by_stop/{stop_id}")
def list_photos_by_stop(stop_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, url, description, trip_id, leg_id, node_id, adventure_id FROM photos WHERE stop_id = %s ORDER BY id DESC", (stop_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

@router.get("/by_adventure/{adventure_id}")
def list_photos_by_adventure(adventure_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, url, description, trip_id, leg_id, node_id, stop_id FROM photos WHERE adventure_id = %s ORDER BY id DESC", (adventure_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


@router.delete("/{photo_id}")
def delete_photo(photo_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT url FROM photos WHERE id = %s", (photo_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Photo not found")

    url = row["url"]
    cur.execute("DELETE FROM photos WHERE id = %s", (photo_id,))
    conn.commit()
    cur.close()
    conn.close()

    # Remove file if exists
    file_path = _upload_path(url)
    if file_path:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass

    return {"message": "Photo deleted"}


# Fixed column names for /covers (never interpolate request values into SQL)
COVER_KINDS = {"trip": "trip_id", "adventure": "adventure_id"}


@router.get("/covers")
def list_cover_photos(kind: str = Query(..., pattern="^(trip|adventure)$"), limit: int = Query(5, ge=1, le=20)):
    """The newest `limit` photos of every trip (or adventure) in one query, for the list pages.

    Returns {"<trip or adventure id>": [photo, ...]}; ids with no photos are left out.
    """
    col = COVER_KINDS[kind]
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT id, url, description, trip_id, leg_id, node_id, stop_id, adventure_id, immich_asset_id
            FROM (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY {col} ORDER BY id DESC) AS rn
                FROM photos
                WHERE {col} IS NOT NULL
            ) p
            WHERE rn <= %s
            ORDER BY {col}, id DESC
            """,
            (limit,),
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()

    covers = {}
    for r in rows:
        covers.setdefault(r[col], []).append(r)
    return covers


