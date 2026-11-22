"""Actual flown flight paths from the OpenSky Network.

Given a flight number and departure date, find the aircraft that flew it and
return its recorded ADS-B track:

1. Flight number -> ICAO callsign and route airports via adsbdb.com (no key).
   Aircraft broadcast the ICAO callsign (BAW117), not the ticket number (BA117).
2. Airport IATA codes -> ICAO codes via hexdb.io (no key), when the leg stores
   3-letter codes.
3. OpenSky /flights/departure (or /flights/arrival) for that airport and day ->
   the matching flight's icao24 (transponder address) and times.
4. OpenSky /tracks/all for that aircraft and time -> the path.
5. The aircraft's registration, type and photo (routers/aircraft.py), best-effort.

OpenSky requires a free account (OAuth2 client credentials in .env) and only
keeps tracks for about 30 days, and it publishes flights in a nightly batch, so
a flight can be fetched from the day after it flew until ~30 days later.
Callers should store the result; it can't be fetched again later.
"""
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

import config
from .aircraft import describe_aircraft
from .http_util import TIMEOUT_SECONDS, USER_AGENT, get_json as _get_json, lookup as _lookup

router = APIRouter(prefix="/api/integrations/opensky", tags=["opensky"])

OPENSKY_API = "https://opensky-network.org/api"
OPENSKY_TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
ADSBDB_API = "https://api.adsbdb.com/v0"
HEXDB_API = "https://hexdb.io/api/v1"
TRACK_RETENTION_DAYS = 30

FLIGHT_NUMBER_RE = re.compile(r"^[A-Z0-9]{2,3}\d{1,4}[A-Z]{0,2}$")
ICAO_CALLSIGN_RE = re.compile(r"^([A-Z]{3})(\d{1,4}[A-Z]{0,2})$")
IATA_FLIGHT_RE = re.compile(r"^([A-Z0-9]{2})(\d{1,4})([A-Z]?)$")
ICAO_AIRPORT_RE = re.compile(r"^[A-Z]{4}$")
IATA_AIRPORT_RE = re.compile(r"^[A-Z]{3}$")

_token_lock = threading.Lock()
_token = {"value": None, "expires_at": 0.0}


def is_configured() -> bool:
    return bool(config.OPENSKY_CLIENT_ID and config.OPENSKY_CLIENT_SECRET)


class FlightTrackRequest(BaseModel):
    flight_number: str = Field(..., min_length=2, max_length=12)
    date: date  # departure date (local), as stored on the leg
    start_airport: Optional[str] = Field(None, max_length=60)
    end_airport: Optional[str] = Field(None, max_length=60)


# --- HTTP helpers ------------------------------------------------------------

def _opensky_token(force_refresh: bool = False) -> str:
    with _token_lock:
        if not force_refresh and _token["value"] and time.time() < _token["expires_at"]:
            return _token["value"]
        body = urllib.parse.urlencode({
            "grant_type": "client_credentials",
            "client_id": config.OPENSKY_CLIENT_ID,
            "client_secret": config.OPENSKY_CLIENT_SECRET,
        }).encode("utf-8")
        request = urllib.request.Request(
            OPENSKY_TOKEN_URL, data=body, method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT},
        )
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (400, 401):
                raise HTTPException(status_code=502, detail="OpenSky rejected the client credentials (check OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET)")
            raise HTTPException(status_code=502, detail=f"OpenSky login error {e.code}")
        except (urllib.error.URLError, TimeoutError, ValueError):
            raise HTTPException(status_code=502, detail="Could not reach the OpenSky login server")
        token = payload.get("access_token")
        if not token:
            raise HTTPException(status_code=502, detail="OpenSky login returned no token")
        # Tokens last ~30 minutes; renew a minute early
        _token["value"] = token
        _token["expires_at"] = time.time() + max(60, int(payload.get("expires_in") or 1800) - 60)
        return token


def _opensky(path: str, params: dict):
    """GET an OpenSky endpoint with a bearer token. Returns None on 404 (no data)."""
    url = f"{OPENSKY_API}{path}?{urllib.parse.urlencode(params)}"
    for attempt in range(2):
        headers = {"Authorization": f"Bearer {_opensky_token(force_refresh=attempt > 0)}"}
        try:
            return _get_json(url, headers=headers, service="OpenSky")
        except urllib.error.HTTPError as e:
            if e.code == 401 and attempt == 0:
                continue  # token expired early; refresh and retry once
            if e.code == 429:
                retry = e.headers.get("X-Rate-Limit-Retry-After-Seconds")
                wait = f" Try again in about {max(1, int(retry) // 60)} min." if retry and retry.isdigit() else ""
                raise HTTPException(status_code=429, detail=f"OpenSky daily credit limit reached.{wait}")
            if e.code in (401, 403):
                raise HTTPException(status_code=502, detail="OpenSky refused the request (check the OpenSky credentials)")
            raise HTTPException(status_code=502, detail=f"OpenSky error {e.code}")
    raise HTTPException(status_code=502, detail="OpenSky authentication failed")


# --- Lookups -----------------------------------------------------------------

def _normalize_code(value: Optional[str]) -> str:
    return re.sub(r"[\s-]+", "", (value or "")).upper()


def _callsign_candidates(flight: str, route: Optional[dict]) -> list[str]:
    """ICAO callsigns this flight may have broadcast, most likely first."""
    candidates: list[str] = []

    def add(cs):
        if cs and cs not in candidates:
            candidates.append(cs)

    if route:
        add(_normalize_code(route.get("callsign_icao")))
    if ICAO_CALLSIGN_RE.match(flight):
        add(flight)
    m = IATA_FLIGHT_RE.match(flight)
    if m:
        iata, number, suffix = m.groups()
        number = number.lstrip("0") or "0"  # BA0117 broadcasts as BAW117
        icao_codes = []
        if route and (route.get("airline") or {}).get("icao"):
            icao_codes.append(route["airline"]["icao"])
        if not icao_codes:
            airlines = (_lookup(f"{ADSBDB_API}/airline/{iata}", "adsbdb") or {}).get("response")
            if isinstance(airlines, list):
                icao_codes = [a.get("icao") for a in airlines if a.get("icao")]
        for icao in icao_codes:
            add(f"{icao.upper()}{number}{suffix}")
    return candidates


def _airport_icao(value: Optional[str]) -> Optional[str]:
    """ICAO airport code from a stored airport field ('EGLL', 'LHR'), else None."""
    code = _normalize_code(value)
    if ICAO_AIRPORT_RE.match(code):
        return code
    if IATA_AIRPORT_RE.match(code):
        info = _lookup(f"{HEXDB_API}/airport/iata/{code}", "hexdb.io") or {}
        icao = _normalize_code(info.get("icao"))
        return icao if ICAO_AIRPORT_RE.match(icao) else None
    return None


def _airport_summary(a: Optional[dict]) -> Optional[dict]:
    if not a:
        return None
    return {
        "iata": a.get("iata_code"),
        "icao": a.get("icao_code"),
        "name": a.get("name"),
        "latitude": a.get("latitude"),
        "longitude": a.get("longitude"),
        "municipality": a.get("municipality"),
        "country": a.get("country_name"),
    }


def _search_windows(day: date, mode: str) -> list[tuple[int, int]]:
    """UTC search windows for a flight on a local date, each under 24 h (cheapest
    OpenSky credit tier). The leg's date is local, so the UTC time may fall on the
    day before or after; arrivals can also land the next day."""
    start = int(datetime(day.year, day.month, day.day, tzinfo=timezone.utc).timestamp())
    day_s = 86400
    if mode == "departure":
        return [(start, start + day_s - 1), (start - 14 * 3600, start - 1), (start + day_s, start + day_s + 12 * 3600 - 1)]
    return [(start, start + day_s - 1), (start + day_s, start + 2 * day_s - 1), (start - 14 * 3600, start - 1)]


def _find_flight(mode: str, airport: str, other_airport: Optional[str], day: date, callsigns: list[str]) -> Optional[dict]:
    other_key = "estArrivalAirport" if mode == "departure" else "estDepartureAirport"
    for begin, end in _search_windows(day, mode):
        flights = _opensky(f"/flights/{mode}", {"airport": airport, "begin": begin, "end": end}) or []
        matches = [f for f in flights if _normalize_code(f.get("callsign")) in callsigns]
        if matches:
            # Prefer the expected callsign, then the expected other airport
            matches.sort(key=lambda f: (
                callsigns.index(_normalize_code(f.get("callsign"))),
                0 if other_airport and f.get(other_key) == other_airport else 1,
                f.get("firstSeen") or 0,
            ))
            return matches[0]
    return None


# --- Endpoints ---------------------------------------------------------------

@router.get("/route")
def flight_route(flight_number: str = Query(..., min_length=2, max_length=12)):
    """Scheduled route for a flight number via adsbdb (keyless, so it works
    without OpenSky credentials): airline and origin/destination airports.
    This is the route the flight number flies today, which is usually but not
    always the route it flew in the past."""
    flight = _normalize_code(flight_number)
    if not FLIGHT_NUMBER_RE.match(flight):
        raise HTTPException(status_code=400, detail="Enter a flight number like BA117 or BAW117")
    route = (_lookup(f"{ADSBDB_API}/callsign/{flight}", "adsbdb") or {}).get("response")
    route = (route or {}).get("flightroute") if isinstance(route, dict) else None
    if not route:
        raise HTTPException(status_code=404, detail=f"No route found for {flight}")
    airline = route.get("airline") or {}
    return {
        "callsign": route.get("callsign_icao") or route.get("callsign"),
        "airline": {"name": airline.get("name"), "iata": airline.get("iata"), "icao": airline.get("icao")} if airline else None,
        "origin": _airport_summary(route.get("origin")),
        "destination": _airport_summary(route.get("destination")),
    }


@router.post("/flight-track")
def flight_track(req: FlightTrackRequest):
    """Find a flight by number and date and return its recorded track.

    Returns the matched callsign, aircraft and airports, and the path as
    [lon, lat] pairs (same order as the ORS route endpoint).
    """
    if not is_configured():
        raise HTTPException(status_code=503, detail="OpenSky is not configured (set OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET in .env)")

    flight = _normalize_code(req.flight_number)
    if not FLIGHT_NUMBER_RE.match(flight):
        raise HTTPException(status_code=400, detail="Enter a flight number like BA117 or BAW117")

    today = datetime.now(timezone.utc).date()
    if req.date >= today:
        raise HTTPException(status_code=409, detail="OpenSky publishes flights in a nightly batch. Fetch the path the day after the flight.")
    if req.date < today - timedelta(days=TRACK_RETENTION_DAYS):
        raise HTTPException(status_code=410, detail=f"OpenSky only keeps flight tracks for about {TRACK_RETENTION_DAYS} days. The map will show the great-circle route.")

    route = (_lookup(f"{ADSBDB_API}/callsign/{flight}", "adsbdb") or {}).get("response")
    route = (route or {}).get("flightroute") if isinstance(route, dict) else None

    callsigns = _callsign_candidates(flight, route)
    if not callsigns:
        raise HTTPException(status_code=404, detail=f"Couldn't work out the radio callsign for {flight}. Try the ICAO form (e.g. BAW117).")

    # Airports: the leg's own codes win; fall back to the route adsbdb knows today
    origin = (route or {}).get("origin") or {}
    destination = (route or {}).get("destination") or {}
    dep_airport = _airport_icao(req.start_airport) or _normalize_code(origin.get("icao_code")) or None
    arr_airport = _airport_icao(req.end_airport) or _normalize_code(destination.get("icao_code")) or None
    if not dep_airport and not arr_airport:
        raise HTTPException(status_code=422, detail="Couldn't determine the airports for this flight. Enter the start and end airport codes (e.g. LHR, JFK).")

    match = None
    if dep_airport:
        match = _find_flight("departure", dep_airport, arr_airport, req.date, callsigns)
    if not match and arr_airport:
        match = _find_flight("arrival", arr_airport, dep_airport, req.date, callsigns)
    if not match:
        where = " / ".join(a for a in (dep_airport, arr_airport) if a)
        raise HTTPException(
            status_code=404,
            detail=f"OpenSky has no record of {' or '.join(callsigns)} at {where} around {req.date.isoformat()}.",
        )

    first_seen = int(match.get("firstSeen") or 0)
    last_seen = int(match.get("lastSeen") or first_seen)
    icao24 = (match.get("icao24") or "").lower()
    track = _opensky("/tracks/all", {"icao24": icao24, "time": (first_seen + last_seen) // 2}) if icao24 else None
    path = (track or {}).get("path") or []
    # path entries: [time, latitude, longitude, baro_altitude, true_track, on_ground]
    coordinates = [
        [p[2], p[1]] for p in path
        if isinstance(p, list) and len(p) >= 3 and p[1] is not None and p[2] is not None
    ]
    if len(coordinates) < 2:
        raise HTTPException(status_code=404, detail="OpenSky found the flight but has no recorded track for it.")

    return {
        "source": "opensky",
        "callsign": _normalize_code(match.get("callsign")),
        "icao24": icao24,
        "departure_airport": match.get("estDepartureAirport"),
        "arrival_airport": match.get("estArrivalAirport"),
        "first_seen": first_seen,
        "last_seen": last_seen,
        "route": {"origin": _airport_summary(origin or None), "destination": _airport_summary(destination or None)} if route else None,
        "aircraft": _aircraft_or_none(icao24),
        "coordinates": coordinates,
    }


def _aircraft_or_none(icao24: str):
    """The airframe that flew it (type, registration, photo), best-effort."""
    try:
        return describe_aircraft(icao24=icao24) if icao24 else None
    except Exception:  # a failed lookup or photo download must not lose the track
        return None
