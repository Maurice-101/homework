import calendar
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from api.model.study import StudySession
from api.model.course import Course
from api.schemas.study import StudyPingOut, StudyBucketOut, StudyBreakdownOut

# The client never reports how long it's been open — each accepted ping just adds this
# fixed step. MIN_PING_INTERVAL guards against a client (accidentally or deliberately)
# firing pings faster than the frontend's own interval to inflate the total.
PING_STEP_MINUTES = 1
MIN_PING_INTERVAL_SECONDS = 50
MAX_MINUTES_PER_DAY = 16 * 60

GENERAL_LABEL = "General"


def ping(student_id: int, course_id: int | None, db: Session) -> StudyPingOut:
    today = date.today()
    row = db.query(StudySession).filter(
        StudySession.student_id == student_id,
        StudySession.date == today,
        StudySession.course_id == course_id,
    ).first()

    if row is None:
        row = StudySession(student_id=student_id, course_id=course_id, date=today, minutes=PING_STEP_MINUTES)
        db.add(row)
    else:
        seconds_since_last = (datetime.utcnow() - row.updated_at).total_seconds() if row.updated_at else 999
        if seconds_since_last >= MIN_PING_INTERVAL_SECONDS and row.minutes < MAX_MINUTES_PER_DAY:
            row.minutes += PING_STEP_MINUTES

    db.commit()
    db.refresh(row)
    return StudyPingOut(date=row.date, minutes=row.minutes)


def weekly(student_id: int, db: Session) -> list:
    """Kept for the dashboard's small 7-day sparkline (no per-subject breakdown needed there)."""
    today = date.today()
    start = today - timedelta(days=6)
    rows = db.query(StudySession).filter(
        StudySession.student_id == student_id,
        StudySession.date >= start,
        StudySession.date <= today,
    ).all()
    by_date = {}
    for r in rows:
        by_date[r.date] = by_date.get(r.date, 0) + r.minutes

    out = []
    for i in range(7):
        d = start + timedelta(days=i)
        out.append({"date": d, "weekday": d.strftime("%a"), "minutes": by_date.get(d, 0)})
    return out


def _month_bounds(d: date) -> tuple:
    start = d.replace(day=1)
    end = d.replace(day=calendar.monthrange(d.year, d.month)[1])
    return start, end


def _range_for_period(period: str, start_q: date | None, end_q: date | None) -> tuple:
    today = date.today()
    if period == "day":
        return today, today
    if period == "week":
        return today - timedelta(days=6), today
    if period == "month":
        return _month_bounds(today)
    if period == "year":
        return date(today.year, 1, 1), date(today.year, 12, 31)
    if period == "custom":
        if not start_q or not end_q:
            raise ValueError("custom period requires start and end")
        return min(start_q, end_q), max(start_q, end_q)
    raise ValueError(f"Unknown period: {period}")


def _bucket_key(d: date, granularity: str) -> tuple:
    """Returns (bucket_start_date, label) for the bucket a given day belongs to."""
    if granularity == "day":
        return d, d.strftime("%a %b %-d")
    if granularity == "week":
        monday = d - timedelta(days=d.weekday())
        return monday, f"Week of {monday.strftime('%b %-d')}"
    if granularity == "month":
        first = d.replace(day=1)
        return first, first.strftime("%B")
    raise ValueError(granularity)


def _choose_granularity(start: date, end: date) -> str:
    span_days = (end - start).days + 1
    if span_days <= 31:
        return "day"
    if span_days <= 370:
        return "week"
    return "month"


def breakdown(student_id: int, period: str, start_q: date | None, end_q: date | None, db: Session) -> StudyBreakdownOut:
    start, end = _range_for_period(period, start_q, end_q)

    if period == "day":
        granularity = "day"
    elif period == "week":
        granularity = "day"
    elif period == "month":
        granularity = "week"
    elif period == "year":
        granularity = "month"
    else:
        granularity = _choose_granularity(start, end)

    rows = db.query(StudySession).filter(
        StudySession.student_id == student_id,
        StudySession.date >= start,
        StudySession.date <= end,
    ).all()

    course_ids = {r.course_id for r in rows if r.course_id}
    titles = {}
    if course_ids:
        for c in db.query(Course).filter(Course.id.in_(course_ids)).all():
            titles[c.id] = c.title

    buckets = {}   # bucket_start -> {label, minutes, by_subject}
    for r in rows:
        key, label = _bucket_key(r.date, granularity)
        b = buckets.setdefault(key, {"label": label, "minutes": 0, "by_subject": {}})
        b["minutes"] += r.minutes
        subject = titles.get(r.course_id, GENERAL_LABEL)
        b["by_subject"][subject] = b["by_subject"].get(subject, 0) + r.minutes

    # Ensure every bucket in range appears even with zero minutes, so charts don't have gaps.
    cursor = start
    while cursor <= end:
        key, label = _bucket_key(cursor, granularity)
        buckets.setdefault(key, {"label": label, "minutes": 0, "by_subject": {}})
        cursor += timedelta(days=1)

    ordered_keys = sorted(buckets.keys())
    bucket_list = [
        StudyBucketOut(label=buckets[k]["label"], date=k, minutes=buckets[k]["minutes"], by_subject=buckets[k]["by_subject"])
        for k in ordered_keys
    ]

    by_subject_total = {}
    for r in rows:
        subject = titles.get(r.course_id, GENERAL_LABEL)
        by_subject_total[subject] = by_subject_total.get(subject, 0) + r.minutes

    return StudyBreakdownOut(
        period=period, start=start, end=end, buckets=bucket_list,
        by_subject_total=by_subject_total, total_minutes=sum(r.minutes for r in rows),
    )
