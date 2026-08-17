"""Cloudflare R2 helpers.

Listing/uploading go through the Cloudflare REST API (Bearer token) —
/accounts/{account_id}/r2/buckets/{bucket}/objects.  Reading an object's
bytes goes through the S3-compatible endpoint instead: Cloudflare's edge WAF
on api.cloudflare.com blocks GET requests whose encoded key contains ".."
(a path-traversal signature) even when it's just part of a filename, and a
few of the uploaded books have names like "P1-English-PB ..pdf". The bucket's
own S3 endpoint isn't behind that WAF rule.
"""
import re
import uuid
import urllib.parse
import boto3
import requests
from botocore.config import Config
from botocore.exceptions import ClientError
from api.settings import settings

_CF_API  = settings.cf_api_base
_HEADERS = {"Authorization": f"Bearer {settings.token_value}"}

_s3_client = boto3.client(
    "s3",
    endpoint_url=settings.bucket_url,
    aws_access_key_id=settings.r2_access_key_id,
    aws_secret_access_key=settings.r2_secret_access_key,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)


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


def fetch_object(key: str) -> tuple[str, "object"]:
    """Stream an object from R2 via the S3-compatible endpoint.

    Returns (content_type, iterator[bytes]).
    """
    try:
        resp = _s3_client.get_object(Bucket=settings.r2_bucket_name, Key=key)
    except ClientError as exc:
        raise FileNotFoundError(key) from exc
    content_type = resp.get("ContentType") or "application/pdf"
    return content_type, resp["Body"].iter_chunks(chunk_size=65536)


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
