"""Server-side proxies for third-party APIs that need secret keys.

Keys are read from the environment (config.py) and never sent to the browser.
"""
import json
import urllib.error
import urllib.request

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import config

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
ORS_TIMEOUT_SECONDS = 15


class LatLon(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class RouteRequest(BaseModel):
    start: LatLon
    end: LatLon


@router.get("/status")
def integration_status():
    """Report which integrations are configured (without revealing keys)."""
    return {
        "ors_configured": bool(config.ORS_API_KEY),
        "immich_configured": bool(config.IMMICH_URL and config.IMMICH_API_KEY),
    }


@router.post("/ors/route")
def ors_route(req: RouteRequest):
    """Driving route between two points via OpenRouteService.

    Returns duration (seconds), distance (miles), and the route as [lon, lat] pairs.
    """
    if not config.ORS_API_KEY:
        raise HTTPException(status_code=503, detail="OpenRouteService is not configured (set ORS_API_KEY in .env)")

    body = json.dumps({
        "coordinates": [[req.start.lon, req.start.lat], [req.end.lon, req.end.lat]],
        "units": "mi",
    }).encode("utf-8")
    request = urllib.request.Request(
        ORS_DIRECTIONS_URL,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/geo+json, application/json",
            "Authorization": config.ORS_API_KEY,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=ORS_TIMEOUT_SECONDS) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        # Surface ORS's own error message (it never contains our key)
        message = ""
        try:
            payload = json.loads(e.read().decode("utf-8"))
            err = payload.get("error")
            message = err.get("message") if isinstance(err, dict) else (err or "")
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"OpenRouteService error {e.code}{': ' + message if message else ''}")
    except (urllib.error.URLError, TimeoutError):
        raise HTTPException(status_code=502, detail="Could not reach OpenRouteService")
    except ValueError:
        raise HTTPException(status_code=502, detail="Invalid response from OpenRouteService")

    features = data.get("features") or []
    if not features:
        raise HTTPException(status_code=502, detail="OpenRouteService returned no route")
    feat = features[0]
    summary = (feat.get("properties") or {}).get("summary") or {}
    coordinates = (feat.get("geometry") or {}).get("coordinates") or []

    return {
        "duration_seconds": round(summary.get("duration") or 0),
        "distance_miles": summary.get("distance") or 0,
        "coordinates": coordinates,
    }
