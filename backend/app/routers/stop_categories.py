from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connect import get_db

router = APIRouter(prefix="/api/stop_categories", tags=["stop_categories"])


class StopCategory(BaseModel):
    name: str
    emoji: str | None = None


class StopCategoryUpdate(BaseModel):
    emoji: str | None = None


@router.get("/")
def list_categories():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name, emoji, created_at, updated_at FROM stop_categories ORDER BY name ASC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "emoji": r["emoji"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        } for r in rows
    ]


@router.post("/")
def create_category(cat: StopCategory):
    name = cat.name.strip().lower()
    emoji = (cat.emoji or '').strip() or None
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    if name == "other":
        # already exists / reserved
        raise HTTPException(status_code=400, detail="'other' already exists")
    # Basic emoji length guard (allow multi-codepoint up to 16 chars)
    if emoji and len(emoji) > 16:
        raise HTTPException(status_code=400, detail="Emoji too long (max 16 characters)")
    conn = get_db()
    cur = conn.cursor()
    # Check exists
    cur.execute("SELECT 1 FROM stop_categories WHERE name = %s", (name,))
    if cur.fetchone():
        cur.close(); conn.close()
        raise HTTPException(status_code=400, detail="Category already exists")
    cur.execute("INSERT INTO stop_categories (name, emoji) VALUES (%s, %s) RETURNING id, emoji", (name, emoji))
    row = cur.fetchone()
    conn.commit()
    cur.close(); conn.close()
    return {"id": row["id"], "name": name, "emoji": row["emoji"]}


@router.patch("/{identifier}")
def update_category(identifier: str, update: StopCategoryUpdate):
    if update.emoji is not None and len(update.emoji) > 16:
        raise HTTPException(status_code=400, detail="Emoji too long (max 16 characters)")

    conn = get_db()
    cur = conn.cursor()

    # Resolve identifier
    if identifier.isdigit():
        cur.execute("SELECT id, name FROM stop_categories WHERE id = %s", (int(identifier),))
    else:
        cur.execute("SELECT id, name FROM stop_categories WHERE name = %s", (identifier.strip().lower(),))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Category not found")
    if row['name'] == 'other' and update.emoji is None:
        # no restriction on updating emoji for 'other'
        pass

    cur.execute("UPDATE stop_categories SET emoji = %s WHERE id = %s RETURNING id, name, emoji", (update.emoji, row['id']))
    updated = cur.fetchone()
    conn.commit()
    cur.close(); conn.close()
    return {"id": updated['id'], "name": updated['name'], "emoji": updated['emoji']}


@router.delete("/{identifier}")
def delete_category(identifier: str):
    # identifier can be numeric id or name
    conn = get_db()
    cur = conn.cursor()

    # Try numeric id first
    target_name = None
    if identifier.isdigit():
        cur.execute("SELECT name FROM stop_categories WHERE id = %s", (int(identifier),))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            raise HTTPException(status_code=404, detail="Category not found")
        target_name = row["name"].strip().lower()
    else:
        target_name = identifier.strip().lower()
        cur.execute("SELECT id FROM stop_categories WHERE name = %s", (target_name,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            raise HTTPException(status_code=404, detail="Category not found")

    if target_name == "other":
        cur.close(); conn.close()
        raise HTTPException(status_code=400, detail="Cannot delete 'other'")

    # Reassign stops
    cur.execute("UPDATE stops SET category = 'other' WHERE category = %s", (target_name,))
    # Delete
    cur.execute("DELETE FROM stop_categories WHERE name = %s", (target_name,))
    conn.commit()
    cur.close(); conn.close()
    return {"message": f"Category '{target_name}' deleted and stops reassigned to 'other'"}
