"""Small stdlib HTTP helpers shared by the integration routers."""
import json
import urllib.error
import urllib.request
from typing import Optional

from fastapi import HTTPException

USER_AGENT = "WayPoints (self-hosted travel tracker)"
TIMEOUT_SECONDS = 30


def get_json(url: str, headers: Optional[dict] = None, service: str = "service"):
    """GET a JSON document. Returns None on 404; raises HTTPError for other errors."""
    request = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT, **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    except (urllib.error.URLError, TimeoutError):
        raise HTTPException(status_code=502, detail=f"Could not reach {service}")
    except ValueError:
        raise HTTPException(status_code=502, detail=f"Invalid response from {service}")


def lookup(url: str, service: str):
    """Best-effort lookup against a keyless helper API: any failure means 'unknown'."""
    try:
        return get_json(url, service=service)
    except (urllib.error.HTTPError, HTTPException):
        return None


def download(url: str, max_bytes: int, content_type_prefix: str) -> Optional[bytes]:
    """Fetch a small binary file, or None if it fails, has the wrong type or is too big."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as resp:
            if not (resp.headers.get("Content-Type") or "").startswith(content_type_prefix):
                return None
            data = resp.read(max_bytes + 1)
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None
    return data if 0 < len(data) <= max_bytes else None
