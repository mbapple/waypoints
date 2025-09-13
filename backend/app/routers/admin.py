from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime
import os
import subprocess
import shutil

router = APIRouter(prefix="/api/admin", tags=["admin"])

BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "/workspaces/src/backups")).resolve()
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_SUFFIXES = {".dump", ".sql"}

def _safe_backup_path(name: str) -> Path:
    p = (BACKUP_DIR / name).resolve()
    if not str(p).startswith(str(BACKUP_DIR)) or p.suffix.lower() not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="Invalid filename")
    return p

def _db_config():
    return {
        "host": os.getenv("DB_HOST", "172.17.0.1"),
        "port": str(os.getenv("DB_PORT", "5432")),
        "db": os.getenv("DB_NAME", "travel_database"),
        "user": os.getenv("DB_USER", "user"),
        "password": os.getenv("DB_PASS", "password"),
    }

def _pg_env_and_args():
    cfg = _db_config()
    env = os.environ.copy()
    if cfg["password"]:
        env["PGPASSWORD"] = cfg["password"]  # avoids exposing password in process list
    base_args = ["-h", cfg["host"], "-p", cfg["port"], "-U", cfg["user"]]
    return env, base_args, cfg["db"]

def _run(cmd: list[str], env: dict | None = None) -> tuple[int, str]:
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=False, env=env)
        out = (res.stdout or "") + (("\n" + res.stderr) if res.stderr else "")
        return res.returncode, out.strip()
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"Command not found: {cmd[0]}. Install postgresql-client.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/db/backup")
def create_backup():
    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    filename = f"backup-{ts}.dump"
    dest = (BACKUP_DIR / filename).resolve()

    env, base_args, dbname = _pg_env_and_args()
    cmd = ["pg_dump", "--format=custom", f"--file={str(dest)}", *base_args, dbname]
    code, log = _run(cmd, env=env)
    if code != 0 or not dest.exists():
        raise HTTPException(status_code=500, detail=f"Backup failed\n{log}")

    return {
        "filename": filename,
        "path": str(dest),
        "size_bytes": dest.stat().st_size,
        "created_utc": ts,
        "log": log,
    }

@router.get("/db/backups")
def list_backups():
    items = []
    for p in sorted(BACKUP_DIR.glob("*"), key=lambda x: x.stat().st_mtime, reverse=True):
        if p.is_file() and p.suffix.lower() in ALLOWED_SUFFIXES:
            items.append({
                "filename": p.name,
                "size_bytes": p.stat().st_size,
                "modified_utc": datetime.utcfromtimestamp(p.stat().st_mtime).strftime("%Y-%m-%dT%H:%M:%SZ"),
            })
    return items

@router.get("/db/backups/{filename}")
def download_backup(filename: str):
    path = _safe_backup_path(filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path, filename=path.name, media_type="application/octet-stream")

@router.post("/db/restore")
def restore_database(
    filename: str | None = Query(default=None, description="Existing backup filename"),
    file: UploadFile | None = File(default=None, description="Upload a .dump or .sql"),
):
    if not filename and not file:
        raise HTTPException(status_code=400, detail="Provide either 'filename' or upload a 'file'")

    if filename:
        src = _safe_backup_path(filename)
        if not src.exists():
            raise HTTPException(status_code=404, detail="Backup not found")
    else:
        if not file or not any(file.filename.endswith(s) for s in ALLOWED_SUFFIXES):
            raise HTTPException(status_code=400, detail="File must be .dump or .sql")
        ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        saved_name = f"restore-upload-{ts}{Path(file.filename).suffix.lower()}"
        src = (BACKUP_DIR / saved_name).resolve()
        with src.open("wb") as out:
            shutil.copyfileobj(file.file, out)

    env, base_args, dbname = _pg_env_and_args()
    if src.suffix.lower() == ".dump":
        cmd = [
            "pg_restore",
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-privileges",
            *base_args,
            "-d", dbname,
            str(src),
        ]
    else:
        cmd = ["psql", *base_args, "-d", dbname, "-f", str(src)]

    code, log = _run(cmd, env=env)
    if code != 0:
        raise HTTPException(status_code=500, detail=f"Restore failed\n{log}")

    return {"restored_from": src.name, "log": log}