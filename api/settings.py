"""Central app configuration.

A single cached pydantic Settings instance loaded from api/.env — every
module should import `settings` from here instead of reading os.environ
or api/.env directly.
"""
import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

_API_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_API_DIR)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(_API_DIR, ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Auth ─────────────────────────────────────────────────────────────
    secret_key: str = "homework-platform-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # ── Database ─────────────────────────────────────────────────────────
    database_url: str = "sqlite:///./homework.db"

    # ── Uploads ──────────────────────────────────────────────────────────
    upload_dir: str = "./uploads"

    # ── Email (OTP delivery via SMTP) ───────────────────────────────────
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = ""

    # ── Cloudflare R2 ────────────────────────────────────────────────────
    r2_account_id: str = ""
    token_value: str = ""            # Cloudflare API bearer token (r2.py auth)
    r2_access_key_id: str = ""       # S3-compatible credentials (unused by
    r2_secret_access_key: str = ""   # the current REST-API upload path)
    r2_bucket_name: str = ""
    r2_jurisdiction: str = ""
    bucket_url: str = ""             # S3-compatible endpoint
    r2_public_url: str = ""
    r2_books_prefix: str = ""        # key prefix inside the bucket, e.g. "PCB-books/"

    # ── AI Learning Assistant (RAG) ──────────────────────────────────────
    deep_infra_key: str = ""
    model_embedder: str = "BAAI/bge-m3"
    dimension: int = 1024
    top_k: int = 5
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection_name: str = "FoundationX"
    qdrant_timeout: int = 60
    llm_model: str = "openrouter/google/gemini-2.5-flash"
    llm_model_fallback: str = "gemini/gemini-2.5-flash"
    llm_model_free: str = ""
    llm_enabled: bool = True
    llm_max_retries: int = 2
    llm_retry_delay: float = 1.0
    open_router_key: str = ""
    google_api_key: str = ""
    google_api_key_fallback: str = ""
    google_api_key_free: str = ""
    tavily_api_key: str = ""
    search_depth: str = "basic"

    @property
    def smtp_from_or_user(self) -> str:
        return self.smtp_from or self.smtp_user

    @property
    def upload_dir_abs(self) -> str:
        path = os.path.abspath(os.path.join(_PROJECT_ROOT, self.upload_dir))
        os.makedirs(os.path.join(path, "submissions"), exist_ok=True)
        return path

    @property
    def r2_public_url_base(self) -> str:
        return self.r2_public_url.rstrip("/")

    @property
    def cf_api_base(self) -> str:
        return f"https://api.cloudflare.com/client/v4/accounts/{self.r2_account_id}/r2/buckets/{self.r2_bucket_name}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
