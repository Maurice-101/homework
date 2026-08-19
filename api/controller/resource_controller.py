import re
import time
import urllib.parse
from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from api.model.resource import Resource
from api.settings import settings
from api.utils import r2

# Simple in-memory cache: (data, expires_at)
_books_cache:  tuple | None = None
_papers_cache: tuple | None = None
_CACHE_TTL = 120  # seconds


def _proxy_url(key: str) -> str:
    """Return a FastAPI proxy URL for the given R2 object key."""
    return f"/api/resources/serve?key={urllib.parse.quote(key, safe='')}"

# Maps folder-name segments (case-insensitive) → canonical subject label
# (used for past-paper folders, which are still one-subject-per-folder)
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

# past-papers/ is a subfolder inside the books prefix, e.g. "PCB-books/past-papers/"
_PAST_PAPERS_PREFIX = settings.r2_books_prefix + "past-papers/"

# Most books live directly under a grade folder with the subject baked into the
# filename rather than a dedicated subject subfolder (e.g. "Auditing S6 SB.pdf").
# Ordered most-specific-first — first match wins.
_SUBJECT_PATTERNS = [
    (r"financial accounting",              "Financial Accounting"),
    (r"management accounting",             "Management Accounting"),
    (r"ict\s*(in|for)?\s*acc(ount|out)ing", "ICT in Accounting"),
    (r"math\w* for acc|sub[_ ]?math",      "Mathematics for Accounting"),
    (r"\btaxation\b",                      "Taxation"),
    (r"\bauditing\b",                      "Auditing"),
    (r"\baccounting\b",                    "Accounting"),
    (r"history.{0,15}citizenship",         "History & Citizenship"),
    (r"\bhistory\b",                       "History"),
    (r"literature",                        "Literature in English"),
    (r"religion and ethics",               "Religion & Ethics"),
    (r"religious studies",                 "Religious Studies"),
    (r"integrated science",                "Integrated Science"),
    (r"\bgscs\b|general studies",          "General Studies"),
    (r"computer science",                  "Computer Science"),
    (r"\bict\b",                           "ICT"),
    (r"entrepreneurship|\bentrep\b",       "Entrepreneurship"),
    (r"kinyarwanda",                       "Kinyarwanda"),
    (r"kiswahili|swahili",                 "Kiswahili"),
    (r"fran[cç]ais|\bfrench\b",            "French"),
    (r"\benglish\b",                       "English"),
    (r"mathemat|\bmaths?\b",               "Mathematics"),
    (r"chem(is|s)try",                     "Chemistry"),
    (r"\bbiology\b",                       "Biology"),
    (r"\bphysics\b",                       "Physics"),
    (r"geography",                         "Geography"),
    (r"agric",                             "Agriculture"),
    (r"economics",                         "Economics"),
    (r"creative performance",              "Creative Performance"),
    (r"\bmusic\b",                         "Music"),
    (r"physical education|\bpes\b|\bsport", "Physical Education"),
    (r"foundations? of education",         "Foundations of Education"),
    (r"special ed\w* needs",               "Special Education Needs"),
    (r"social studies",                    "Social Studies"),
    (r"home\s*science",                    "Home Science"),
    (r"clinical placement",                "Clinical Placement"),
    (r"fundamentals? of nursing",          "Fundamentals of Nursing"),
    (r"medical pathology",                 "Medical Pathology"),
    (r"\bethics\b",                        "Ethics"),
]
_SUBJECT_PATTERNS = [(re.compile(p, re.I), label) for p, label in _SUBJECT_PATTERNS]

_GRADE_PRIMARY_RE   = re.compile(r"^Primary_(\d)$", re.I)
_GRADE_SECONDARY_RE = re.compile(r"^s(\d)$", re.I)
_GRADE_YEAR_RE      = re.compile(r"^Year_(\d)$", re.I)
_TYPE_TG_RE         = re.compile(r"\bTG\b|teacher.?s?\s*guide", re.I)


def _year(name: str) -> str:
    m = re.search(r"(20\d{2})", name)
    return m.group(1) if m else ""


def _grade(name: str) -> str:
    for g in ("S4", "S5", "S6"):
        if g in name:
            return g
    return ""


def _normalize_grade(raw: str, stream: str) -> str:
    """Turn a raw grade-folder name into a display label, e.g. 'Primary_3' -> 'P3'."""
    m = _GRADE_PRIMARY_RE.match(raw)
    if m:
        return f"P{m.group(1)}"
    m = _GRADE_SECONDARY_RE.match(raw)
    if m:
        return f"S{m.group(1)}"
    m = _GRADE_YEAR_RE.match(raw)
    if m:
        return f"TTC Y{m.group(1)}" if "training" in stream.lower() else f"Y{m.group(1)}"
    return raw


def _grade_sort_key(g: str):
    m = re.match(r"^P(\d)$", g)
    if m: return (0, int(m.group(1)))
    m = re.match(r"^S(\d)$", g)
    if m: return (1, int(m.group(1)))
    m = re.match(r"^TTC Y(\d)$", g)
    if m: return (2, int(m.group(1)))
    m = re.match(r"^Y(\d)$", g)
    if m: return (3, int(m.group(1)))
    return (4, g)


def _infer_subject(filename: str, folder_subject: Optional[str]) -> str:
    """Prefer an explicit subject subfolder; otherwise infer from the filename."""
    if folder_subject:
        return re.sub(r"\s+", " ", folder_subject.replace("_", " ")).strip()
    normalized = filename.replace("_", " ")   # "ICT_S3_TG" / "Physics_Students" -> word boundaries
    for pattern, label in _SUBJECT_PATTERNS:
        if pattern.search(normalized):
            return label
    return "General"


def _infer_type(filename: str) -> str:
    return "teacher_guide" if _TYPE_TG_RE.search(filename) else "textbook"


def _clean_title(filename: str) -> str:
    name = filename[:-4] if filename.lower().endswith(".pdf") else filename
    return re.sub(r"\s+", " ", name).strip(" .-_") or filename


def _subject_from_path(key: str, prefix: str) -> str:
    """Infer subject from the folder segment immediately after *prefix*."""
    relative = key[len(prefix):]          # e.g. "Chemistry/Some Book.pdf"
    segment = relative.split("/")[0].lower()
    return _SUBJECT_MAP.get(segment, segment.title())


def scan_books() -> list:
    """Walk every PDF under the books prefix and derive display metadata from
    its folder path, e.g.:
      Rwanda_Curriculumn_Books/Secondary_books/Accounting/s6/Auditing S6 SB.pdf
      -> level="Secondary", program="Accounting", grade="S6", subject="Auditing"
    Folder naming is inconsistent (sometimes a subject subfolder is present,
    sometimes the subject is only in the filename), so subject/type are
    inferred from the filename when there's no dedicated subject folder.
    """
    global _books_cache
    now = time.time()
    if _books_cache and _books_cache[1] > now:
        return _books_cache[0]

    try:
        objects = r2.list_prefix(settings.r2_books_prefix)
    except Exception as exc:
        print(f"[R2] scan_books error: {exc}")
        return _books_cache[0] if _books_cache else []

    prefix_len = len(settings.r2_books_prefix)
    books = []
    for obj in objects:
        key = obj["key"]
        if not key.lower().endswith(".pdf"):
            continue
        if "/past-papers/" in key:
            continue

        rel = key[prefix_len:]
        folders = rel.split("/")[:-1]
        filename = rel.rsplit("/", 1)[-1]

        level, stream, grade, folder_subject = "", "", "", None
        if len(folders) > 1:
            level = "Primary" if "primary" in folders[1].lower() else \
                    "Secondary" if "secondary" in folders[1].lower() else ""
        if len(folders) > 2:
            stream = folders[2]
        if len(folders) > 3:
            grade = _normalize_grade(folders[3], stream)
        if len(folders) > 4:
            folder_subject = folders[4]

        books.append({
            "id":          f"r2_{key}",
            "title":       _clean_title(filename),
            "subject":     _infer_subject(filename, folder_subject),
            "grade_level": grade,
            "level":       level,
            "program":     stream,
            "type":        _infer_type(filename),
            "file_path":   key,
            "url":         _proxy_url(key),
            "category":    "textbook",
            "source":      "library",
        })
    _books_cache = (books, now + _CACHE_TTL)
    return books


def get_subject_catalog() -> list:
    """Group the library by subject, e.g. for a 'browse by subject' catalog view."""
    grouped: dict = {}
    for b in scan_books():
        entry = grouped.setdefault(b["subject"], {"levels": set(), "count": 0})
        if b["grade_level"]:
            entry["levels"].add(b["grade_level"])
        entry["count"] += 1

    catalog = [
        {
            "subject": subject,
            "levels":  sorted(entry["levels"], key=_grade_sort_key),
            "count":   entry["count"],
        }
        for subject, entry in grouped.items()
    ]
    catalog.sort(key=lambda x: x["subject"])
    return catalog


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
    course_id_filter: Optional[int] = None,
) -> dict:
    # A specific course's materials are exactly its DB-linked resources — the
    # auto-scanned R2 library isn't tied to any course, so skip it here.
    all_r = [] if course_id_filter else (scan_books() + scan_past_papers())

    # DB-uploaded / library-attached resources (file_path holds a full R2 proxy
    # URL for library attachments, or a relative /uploads/ path for direct uploads)
    if db is not None:
        q = db.query(Resource)
        if course_id_filter:
            q = q.filter(Resource.course_id == course_id_filter)
        for res in q.all():
            file_url = res.file_path or ""
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
                "course_id":   res.course_id,
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
    course_id: Optional[int] = None,
) -> dict:
    key = r2.upload_file(file_bytes, filename, prefix="resources")
    url = _proxy_url(key)
    res = Resource(
        title=title, description=description, subject=subject,
        grade_level=grade_level, type=res_type,
        file_path=url,          # store full URL so legacy code still works
        uploaded_by=uploaded_by,
        course_id=course_id,
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
        "course_id":   res.course_id,
    }


def attach_library_material(key: str, course_id: int, uploaded_by: int, db: Session) -> dict:
    """Link an existing R2 library book (or past paper) to a course, without copying the file."""
    book = next((b for b in scan_books() if b["file_path"] == key), None)
    if not book:
        book = next((p for p in scan_past_papers() if p["file_path"] == key), None)
    if not book:
        raise HTTPException(status_code=404, detail="Library item not found")

    res = Resource(
        title=book["title"], subject=book.get("subject"), grade_level=book.get("grade_level"),
        type=book.get("type", "textbook"), file_path=book["url"],
        uploaded_by=uploaded_by, course_id=course_id,
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
        "file_path":   res.file_path,
        "url":         res.file_path,
        "category":    "uploaded",
        "source":      "uploaded",
        "course_id":   res.course_id,
    }


def delete_resource(resource_id: int, user_id: int, db: Session) -> dict:
    res = db.query(Resource).filter(Resource.id == resource_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
    if res.uploaded_by != user_id:
        raise HTTPException(status_code=403, detail="Not your resource")
    db.delete(res)
    db.commit()
    return {"message": "Resource removed"}
