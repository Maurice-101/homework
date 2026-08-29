from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import date as date_type


class StudyPingIn(BaseModel):
    course_id: Optional[int] = None


class StudyPingOut(BaseModel):
    date: date_type
    minutes: int


class StudyDayOut(BaseModel):
    date: date_type
    weekday: str   # "Mon", "Tue", ...
    minutes: int


class StudyBucketOut(BaseModel):
    label: str                     # e.g. "Mon", "Week of Oct 6", "October"
    date: date_type                # bucket start date, for sorting/reference
    minutes: int
    by_subject: Dict[str, int]


class StudyBreakdownOut(BaseModel):
    period: str
    start: date_type
    end: date_type
    buckets: List[StudyBucketOut]
    by_subject_total: Dict[str, int]
    total_minutes: int
