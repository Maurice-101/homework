import os
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "homework-platform-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./homework.db")

# Uploads directory (submissions only — resources now go to R2)
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
UPLOAD_DIR = os.path.abspath(
    os.path.join(_project_root, os.getenv("UPLOAD_DIR", "./uploads"))
)
os.makedirs(os.path.join(UPLOAD_DIR, "submissions"), exist_ok=True)

# ── Cloudflare R2 ──────────────────────────────────────────────────────────────
R2_ACCESS_KEY_ID     = os.getenv("CLOUDFLARE_ACCESS_KEYID", "")
R2_SECRET_ACCESS_KEY = os.getenv("CLOUDFLARE_TOKEN_VALUE", "")
R2_BUCKET_NAME       = os.getenv("R2_BUCKET_NAME", "")
R2_PUBLIC_URL_BASE   = os.getenv("R2_PUBLIC_URL_BASE", "").rstrip("/")

# Derive the S3-compatible endpoint (scheme + host only) from R2_ENDPOINT
_r2_endpoint_raw = os.getenv("R2_ENDPOINT", "")
_parsed = urlparse(_r2_endpoint_raw)
R2_ENDPOINT_URL  = f"{_parsed.scheme}://{_parsed.netloc}" if _parsed.netloc else ""

# The path looks like  /curriculum-books/PCB-books/
# First segment after "/" is the bucket name — strip it to get the key prefix.
# e.g. "curriculum-books/PCB-books/" → bucket="curriculum-books", prefix="PCB-books/"
_path_parts = _parsed.path.strip("/").split("/", 1)
R2_BOOKS_PREFIX  = (_path_parts[1].rstrip("/") + "/") if len(_path_parts) > 1 else ""
