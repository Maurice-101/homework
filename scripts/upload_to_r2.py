#!/usr/bin/env python3
"""Upload a local folder to the R2 bucket, preserving its directory structure as object keys.

Uses the S3-compatible API (boto3) rather than the Cloudflare REST API that
api/utils/r2.py uses at runtime — it handles large files (multipart) and
concurrency better, which matters for bulk migrations like this one.

Usage:
    python scripts/upload_to_r2.py ["Abahizi project document"] [--prefix curriculum/] [--workers 6] [--dry-run]

Safe to re-run: existing objects with a matching size are skipped.
"""
import argparse
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3
from boto3.s3.transfer import TransferConfig
from botocore.config import Config

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _PROJECT_ROOT)

from api.settings import settings  # noqa: E402

DEFAULT_LOCAL_DIR = os.path.join(_PROJECT_ROOT, "Abahizi project document")

# Multipart for anything over 32MB, 16MB parts — several of these PDFs are 40MB+.
_TRANSFER_CONFIG = TransferConfig(multipart_threshold=32 * 1024 * 1024, multipart_chunksize=16 * 1024 * 1024)


def build_client():
    if not settings.bucket_url or not settings.r2_access_key_id or not settings.r2_secret_access_key:
        sys.exit("Missing BUCKET_URL / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in api/.env")
    return boto3.client(
        "s3",
        endpoint_url=settings.bucket_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def existing_objects(client, bucket, prefix):
    """key -> size for everything already under prefix, so reruns can skip unchanged files."""
    sizes = {}
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            sizes[obj["Key"]] = obj["Size"]
    return sizes


def iter_files(local_root):
    for dirpath, _dirnames, filenames in os.walk(local_root):
        for name in filenames:
            if name.startswith("."):
                continue
            yield os.path.join(dirpath, name)


def build_key(local_root, file_path, prefix):
    rel = os.path.relpath(file_path, local_root).replace(os.sep, "/")
    return f"{prefix}{rel}" if prefix else rel


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("local_dir", nargs="?", default=DEFAULT_LOCAL_DIR, help="Folder to upload")
    parser.add_argument("--prefix", default="", help='Key prefix in the bucket, e.g. "curriculum/"')
    parser.add_argument("--workers", type=int, default=6, help="Concurrent uploads (default: 6)")
    parser.add_argument("--dry-run", action="store_true", help="List what would be uploaded without uploading")
    args = parser.parse_args()

    local_dir = os.path.abspath(args.local_dir)
    prefix = args.prefix
    if prefix and not prefix.endswith("/"):
        prefix += "/"

    if not os.path.isdir(local_dir):
        sys.exit(f"Not a directory: {local_dir}")

    bucket = settings.r2_bucket_name
    client = build_client()

    print(f"Local folder : {local_dir}")
    print(f"Bucket       : {bucket}")
    print(f"Key prefix   : {prefix or '(none)'}")

    print("Scanning existing objects in bucket ...")
    remote_sizes = existing_objects(client, bucket, prefix)
    print(f"  {len(remote_sizes)} object(s) already present under this prefix")

    files = list(iter_files(local_dir))
    to_upload = []
    skipped = 0
    for path in files:
        key = build_key(local_dir, path, prefix)
        local_size = os.path.getsize(path)
        if remote_sizes.get(key) == local_size:
            skipped += 1
            continue
        to_upload.append((path, key, local_size))

    total_bytes = sum(size for _, _, size in to_upload)
    print(f"Found {len(files)} local file(s): {len(to_upload)} to upload, {skipped} already up to date "
          f"({total_bytes / 1024 / 1024:.1f} MB to transfer)")

    if args.dry_run:
        for _path, key, size in to_upload:
            print(f"  [dry-run] {key}  ({size / 1024 / 1024:.1f} MB)")
        return

    if not to_upload:
        print("Nothing to upload.")
        return

    done = 0
    failed = []

    def _upload(item):
        path, key, size = item
        client.upload_file(path, bucket, key, Config=_TRANSFER_CONFIG)
        return key, size

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(_upload, item): item for item in to_upload}
        for future in as_completed(futures):
            path, key, size = futures[future]
            done += 1
            try:
                future.result()
                print(f"[{done}/{len(to_upload)}] uploaded {key} ({size / 1024 / 1024:.1f} MB)")
            except Exception as exc:
                failed.append(key)
                print(f"[{done}/{len(to_upload)}] FAILED {key}: {exc}")

    print(f"\nDone. {len(to_upload) - len(failed)} uploaded, {len(failed)} failed, {skipped} skipped.")
    if failed:
        print("Failed keys:")
        for key in failed:
            print(f"  {key}")
        sys.exit(1)


if __name__ == "__main__":
    main()
