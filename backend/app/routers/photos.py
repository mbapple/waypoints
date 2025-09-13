from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List
import os
import shutil
import uuid

from connect import get_db

router = APIRouter(prefix="/api/photos", tags=["photos"])

UPLOAD_DIR = "/workspaces/src/uploads"
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

os.makedirs(UPLOAD_DIR, exist_ok=True)


def _allowed(filename: str) -> bool:
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in ALLOWED_EXTENSIONS


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
        INSERT INTO photos (trip_id, leg_id, node_id, stop_id, adventure_id, url, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (trip_id, leg_id, node_id, stop_id, adventure_id, url_path, description)
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {"id": row["id"], "url": url_path}


@router.get("/by_trip/{trip_id}")
async def list_photos_by_trip(trip_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, url, description, leg_id, node_id, stop_id, adventure_id FROM photos WHERE trip_id = %s ORDER BY id DESC", (trip_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


@router.get("/by_leg/{leg_id}")
async def list_photos_by_leg(leg_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, url, description, trip_id, node_id, stop_id, adventure_id FROM photos WHERE leg_id = %s ORDER BY id DESC", (leg_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


@router.get("/by_node/{node_id}")
async def list_photos_by_node(node_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, url, description, trip_id, leg_id, stop_id, adventure_id FROM photos WHERE node_id = %s ORDER BY id DESC", (node_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


@router.get("/by_stop/{stop_id}")
async def list_photos_by_stop(stop_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, url, description, trip_id, leg_id, node_id, adventure_id FROM photos WHERE stop_id = %s ORDER BY id DESC", (stop_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

@router.get("/by_adventure/{adventure_id}")
async def list_photos_by_adventure(adventure_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, url, description, trip_id, leg_id, node_id, stop_id FROM photos WHERE adventure_id = %s ORDER BY id DESC", (adventure_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


@router.delete("/{photo_id}")
async def delete_photo(photo_id: int):
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
    if url and url.startswith("/uploads/"):
        file_path = os.path.join(UPLOAD_DIR, os.path.basename(url))
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass

    return {"message": "Photo deleted"}


