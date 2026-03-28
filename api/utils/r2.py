"""Cloudflare R2 helpers via the Cloudflare REST API (Bearer token).

Uses /accounts/{account_id}/r2/buckets/{bucket}/objects endpoints — no S3
credentials required.  Files are served through a FastAPI proxy endpoint.
"""
import re
import uuid
import urllib.parse
import requests
from api.config import (
    R2_SECRET_ACCESS_KEY as CF_TOKEN,
    R2_BUCKET_NAME, R2_ENDPOINT_URL,
)

# Account ID is embedded in the S3 endpoint URL:
# https://{account_id}.r2.cloudflarestorage.com
_ACCOUNT_ID = R2_ENDPOINT_URL.split("//")[-1].split(".")[0]
_CF_API     = f"https://api.cloudflare.com/client/v4/accounts/{_ACCOUNT_ID}/r2/buckets/{R2_BUCKET_NAME}"
_HEADERS    = {"Authorization": f"Bearer {CF_TOKEN}"}


def list_prefix(prefix: str) -> list[dict]:
    """
    List all objects under *prefix* using the Cloudflare REST API.
    Returns list of {"key": str}.
    """
    results  = []
    cursor   = None
    while True:
        params = {"prefix": prefix, "per_page": 1000}
        if cursor:
            params["cursor"] = cursor
        resp = requests.get(f"{_CF_API}/objects", headers=_HEADERS, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        for obj in data.get("result", []):
            results.append({"key": obj["key"]})
        # Cloudflare REST API paginates via result_info.cursor
        result_info = data.get("result_info", {})
        cursor = result_info.get("cursor")
        if not cursor:
            break
    return results


def fetch_object(key: str) -> requests.Response:
    """Stream an object from R2 via the Cloudflare REST API."""
    encoded = urllib.parse.quote(key, safe="")
    resp = requests.get(f"{_CF_API}/objects/{encoded}", headers=_HEADERS,
                        stream=True, timeout=30)
    resp.raise_for_status()
    return resp


def upload_file(file_bytes: bytes, filename: str, prefix: str = "resources") -> str:
    """Upload *file_bytes* to R2 via the Cloudflare REST API.  Returns the object key."""
    safe_name = re.sub(r"[^\w.\-]", "_", filename)
    key = f"{prefix}/{uuid.uuid4().hex}_{safe_name}"
    encoded = urllib.parse.quote(key, safe="")
    headers = {**_HEADERS, "Content-Type": "application/pdf"}
    resp = requests.put(f"{_CF_API}/objects/{encoded}",
                        headers=headers, data=file_bytes, timeout=60)
    resp.raise_for_status()
    return key
