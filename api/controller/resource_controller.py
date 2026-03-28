import re
import time
import urllib.parse
from typing import Optional
from sqlalchemy.orm import Session
from api.model.resource import Resource
from api.config import R2_BOOKS_PREFIX
from api.utils import r2

# Simple in-memory cache: (data, expires_at)
_books_cache:  tuple | None = None
_papers_cache: tuple | None = None
_CACHE_TTL = 120  # seconds


def _proxy_url(key: str) -> str:
    """Return a FastAPI proxy URL for the given R2 object key."""
    return f"/api/resources/serve?key={urllib.parse.quote(key, safe='')}"

# Maps folder-name segments (case-insensitive) → canonical subject label
_SUBJECT_MAP = {
    "biology":        "Biology",
    "chemistry":      "Chemistry",
    "computer":       "Computer Science",
    "computer science": "Computer Science",
    "entrepreneurship": "Entrepreneurship",
    "ent":            "Entrepreneurship",
    "mathematics":    "Mathematics",
    "physics":        "Physics",
    "phy":            "Physics",
}

# past-papers/ is a subfolder inside PCB-books/  e.g. "PCB-books/past-papers/"
_PAST_PAPERS_PREFIX = R2_BOOKS_PREFIX + "past-papers/"


def _year(name: str) -> str:
    m = re.search(r"(20\d{2})", name)
    return m.group(1) if m else ""


def _grade(name: str) -> str:
    for g in ("S4", "S5", "S6"):
        if g in name:
            return g
    return ""


def _subject_from_path(key: str, prefix: str) -> str:
    """Infer subject from the folder segment immediately after *prefix*."""
    relative = key[len(prefix):]          # e.g. "Chemistry/Some Book.pdf"
    segment = relative.split("/")[0].lower()
    return _SUBJECT_MAP.get(segment, segment.title())


def scan_books() -> list:
    global _books_cache
    now = time.time()
    if _books_cache and _books_cache[1] > now:
        return _books_cache[0]

    try:
        objects = r2.list_prefix(R2_BOOKS_PREFIX)
    except Exception as exc:
        print(f"[R2] scan_books error: {exc}")
        return _books_cache[0] if _books_cache else []

    books = []
    for obj in objects:
        key = obj["key"]
        if not key.lower().endswith(".pdf"):
            continue
        if "/past-papers/" in key:
            continue
        filename = key.rsplit("/", 1)[-1]
        subject = _subject_from_path(key, R2_BOOKS_PREFIX)
        is_tg = "TG" in filename or "teacher" in filename.lower()
        books.append({
            "id":          f"r2_{key}",
            "title":       filename.replace(".pdf", "").strip(),
            "subject":     subject,
            "grade_level": _grade(filename),
            "type":        "teacher_guide" if is_tg else "textbook",
            "file_path":   key,
            "url":         _proxy_url(key),
            "category":    "textbook",
            "source":      "library",
        })
    _books_cache = (books, now + _CACHE_TTL)
    return books


def scan_past_papers() -> list:
    global _papers_cache
    now = time.time()
    if _papers_cache and _papers_cache[1] > now:
        return _papers_cache[0]

    try:
        objects = r2.list_prefix(_PAST_PAPERS_PREFIX)
    except Exception as exc:
        print(f"[R2] scan_past_papers error: {exc}")
        return _papers_cache[0] if _papers_cache else []

    papers = []
    for obj in objects:
        key = obj["key"]
        if not key.lower().endswith(".pdf"):
            continue
        filename = key.rsplit("/", 1)[-1]
        subject = _subject_from_path(key, _PAST_PAPERS_PREFIX)
        papers.append({
            "id":          f"r2_pp_{key}",
            "title":       filename.replace(".pdf", "").strip(),
            "subject":     subject,
            "year":        _year(filename),
            "type":        "past_paper",
            "file_path":   key,
            "url":         _proxy_url(key),
            "category":    "past_paper",
            "source":      "library",
        })
    _papers_cache = (papers, now + _CACHE_TTL)
    return papers


def get_all_resources(
    subject_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    db: Optional[Session] = None,
) -> dict:
    all_r = scan_books() + scan_past_papers()

    # DB-uploaded resources (now stored with a full R2 URL in file_path)
    if db is not None:
        for res in db.query(Resource).all():
            file_url = res.file_path or ""
            # If already a URL or proxy path, use as-is; otherwise legacy /uploads/ path
            if not file_url.startswith("http") and not file_url.startswith("/"):
                file_url = f"/uploads/{file_url}"
            all_r.append({
                "id":          f"db_{res.id}",
                "title":       res.title,
                "subject":     res.subject or "",
                "grade_level": res.grade_level or "",
                "type":        res.type or "uploaded",
                "file_path":   res.file_path,
                "url":         file_url,
                "category":    "uploaded",
                "source":      "uploaded",
                "description": res.description,
            })

    if subject_filter:
        all_r = [r for r in all_r if subject_filter.lower() in r["subject"].lower()]
    if type_filter:
        all_r = [r for r in all_r if r["type"] == type_filter]

    return {
        "textbooks":   [r for r in all_r if r["category"] == "textbook"],
        "past_papers": [r for r in all_r if r["category"] == "past_paper"],
        "uploaded":    [r for r in all_r if r["category"] == "uploaded"],
        "total":       len(all_r),
    }


def upload_resource(
    title: str, subject: Optional[str], grade_level: Optional[str],
    res_type: str, file_bytes: bytes, filename: str,
    uploaded_by: int, db: Session, description: Optional[str] = None,
) -> dict:
    key = r2.upload_file(file_bytes, filename, prefix="resources")
    url = _proxy_url(key)
    res = Resource(
        title=title, description=description, subject=subject,
        grade_level=grade_level, type=res_type,
        file_path=url,          # store full URL so legacy code still works
        uploaded_by=uploaded_by,
    )
    db.add(res)
    db.commit()
    db.refresh(res)
    return {
        "id":          f"db_{res.id}",
        "title":       res.title,
        "subject":     res.subject or "",
        "grade_level": res.grade_level or "",
        "type":        res.type,
        "file_path":   url,
        "url":         url,
        "category":    "uploaded",
        "source":      "uploaded",
    }
