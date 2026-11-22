"""Aircraft details and photos for flight legs (all keyless).

- adsbdb.com turns a transponder address (icao24) or a registration (tail
  number) into registration, type and ICAO type code. For an icao24 it falls
  back to hexdb.io, then to the open tar1090-db aircraft database (the one
  ADS-B maps use, from Mictronics/readsb) on GitHub, which knows many newer
  airframes the other two don't.
- airport-data.com gives a photo of that airframe with its photographer and
  photo page. The full-size JPEG is downloaded once per registration into
  UPLOAD_DIR/aircraft/<REG>.jpg, with the credit in <REG>.json beside it.
  Photos remain the photographers' copyright: always show the credit and link.
"""
import gzip
import json
import logging
import os
import re
import urllib.parse
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

import config
from .http_util import download, lookup

router = APIRouter(prefix="/api/integrations/aircraft", tags=["aircraft"])
log = logging.getLogger(__name__)

ADSBDB_API = "https://api.adsbdb.com/v0"
HEXDB_API = "https://hexdb.io/api/v1"
AIRCRAFT_DB = "https://raw.githubusercontent.com/wiedehopf/tar1090-db/master/db/{bucket}.js"
AIRCRAFT_DB_MAX_BYTES = 8 * 1024 * 1024
AIRPORT_DATA_API = "https://airport-data.com/api/ac_thumb.json"
AIRPORT_DATA_IMAGE = "https://image.airport-data.com/aircraft/{id}.jpg"
PHOTO_DIR = os.path.join(config.UPLOAD_DIR, "aircraft")
PHOTO_URL_PREFIX = "/uploads/aircraft"
MAX_PHOTO_BYTES = 5 * 1024 * 1024

ICAO24_RE = re.compile(r"^[0-9A-F]{6}$")
REGISTRATION_RE = re.compile(r"^[A-Z0-9][A-Z0-9-]{1,9}$")
PHOTO_ID_RE = re.compile(r"/(\d+)\.jpg$")


def normalize_icao24(value: Optional[str]) -> Optional[str]:
    code = (value or "").strip().upper()
    return code if ICAO24_RE.match(code) else None


def normalize_registration(value: Optional[str]) -> Optional[str]:
    reg = re.sub(r"\s+", "", value or "").upper()
    return reg if REGISTRATION_RE.match(reg) else None


_db_buckets: dict = {}  # a few recently used tar1090-db buckets (only successful loads)


def _db_bucket(name: str) -> Optional[dict]:
    if name not in _db_buckets:
        raw = download(AIRCRAFT_DB.format(bucket=name), AIRCRAFT_DB_MAX_BYTES, "")
        try:
            data = json.loads(gzip.decompress(raw)) if raw else None
        except (OSError, ValueError):
            data = None
        if not isinstance(data, dict):
            return None
        if len(_db_buckets) >= 4:
            _db_buckets.clear()
        _db_buckets[name] = data
    return _db_buckets[name]


def _lookup_open_db(icao24: str) -> Optional[dict]:
    """tar1090-db: files named by a hex prefix hold the rest of each address as
    keys, and list longer prefixes that have files of their own as `children`."""
    code = icao24.upper()
    for level in range(1, len(code)):
        bucket = _db_bucket(code[:level])
        if not bucket:
            return None
        entry = bucket.get(code[level:])
        if entry:
            registration, icao_type, _flags, description = (list(entry) + [None] * 4)[:4]
            return {
                "icao24": icao24.lower(),
                "registration": normalize_registration(registration),
                "type": description or None,
                "icao_type": (icao_type or "").upper() or None,
                "operator": None,
            }
        if code[:level + 1] not in (bucket.get("children") or []):
            return None
    return None


def lookup_aircraft(icao24: Optional[str] = None, registration: Optional[str] = None) -> Optional[dict]:
    """Registration, type and ICAO type code for an airframe, or None if unknown."""
    key = icao24 or registration
    if not key:
        return None
    response = (lookup(f"{ADSBDB_API}/aircraft/{urllib.parse.quote(key)}", "adsbdb") or {}).get("response")
    a = response.get("aircraft") if isinstance(response, dict) else None
    if a:
        return {
            "icao24": (a.get("mode_s") or "").lower() or None,
            "registration": normalize_registration(a.get("registration")),
            "type": " ".join(p for p in (a.get("manufacturer"), a.get("type")) if p) or None,
            "icao_type": (a.get("icao_type") or "").upper() or None,
            "operator": a.get("registered_owner"),
        }
    if icao24:
        h = lookup(f"{HEXDB_API}/aircraft/{icao24}", "hexdb.io") or {}
        if h.get("Registration"):
            return {
                "icao24": icao24.lower(),
                "registration": normalize_registration(h.get("Registration")),
                "type": " ".join(p for p in (h.get("Manufacturer"), h.get("Type")) if p) or None,
                "icao_type": (h.get("ICAOTypeCode") or "").upper() or None,
                "operator": h.get("RegisteredOwners"),
            }
        return _lookup_open_db(icao24)
    return None


def fetch_aircraft_photo(registration: Optional[str], icao24: Optional[str] = None) -> Optional[dict]:
    """Download (once) a photo of this airframe. Returns {url, credit, link} or None."""
    if not registration:
        return None
    base = os.path.join(PHOTO_DIR, registration)
    meta_path = f"{base}.json"
    if os.path.exists(f"{base}.jpg") and os.path.exists(meta_path):
        try:
            with open(meta_path) as f:
                return json.load(f)
        except (OSError, ValueError):
            pass  # re-download below

    query = {"m": icao24.upper()} if icao24 else {"r": registration}
    info = lookup(f"{AIRPORT_DATA_API}?{urllib.parse.urlencode({**query, 'n': 1})}", "airport-data.com") or {}
    item = (info.get("data") or [None])[0] if isinstance(info.get("data"), list) else None
    if not item or not item.get("image"):
        return None
    photo_id = PHOTO_ID_RE.search(item["image"])
    full_size = AIRPORT_DATA_IMAGE.format(id=photo_id.group(1)) if photo_id else None
    data = (full_size and download(full_size, MAX_PHOTO_BYTES, "image/jpeg")) or download(item["image"], MAX_PHOTO_BYTES, "image/jpeg")
    if not data:
        return None

    photo = {"url": f"{PHOTO_URL_PREFIX}/{registration}.jpg", "credit": item.get("photographer"), "link": item.get("link")}
    tmp = f"{base}.{uuid.uuid4().hex}.tmp"
    try:
        os.makedirs(PHOTO_DIR, exist_ok=True)
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, f"{base}.jpg")
        with open(meta_path, "w") as f:
            json.dump(photo, f)
    except OSError as e:  # e.g. uploads/ not writable: keep the details, skip the photo
        log.warning("Could not save aircraft photo for %s in %s: %s", registration, PHOTO_DIR, e)
        return None
    return photo


def describe_aircraft(icao24: Optional[str] = None, registration: Optional[str] = None) -> Optional[dict]:
    """lookup_aircraft plus its photo; None if the airframe is unknown."""
    aircraft = lookup_aircraft(icao24, registration)
    if not aircraft:
        return None
    aircraft["photo"] = fetch_aircraft_photo(aircraft["registration"], aircraft["icao24"])
    return aircraft


@router.get("/")
@router.get("")
def get_aircraft(
    registration: Optional[str] = Query(None, max_length=12),
    icao24: Optional[str] = Query(None, max_length=6),
):
    """Aircraft by registration (tail number) or transponder address, with a photo."""
    reg = normalize_registration(registration)
    hex_code = normalize_icao24(icao24)
    if not reg and not hex_code:
        raise HTTPException(status_code=400, detail="Enter a registration like G-YMMN or a 6-character icao24 code")
    aircraft = describe_aircraft(hex_code, reg)
    if not aircraft:
        raise HTTPException(status_code=404, detail=f"No aircraft found for {reg or hex_code}")
    return aircraft
