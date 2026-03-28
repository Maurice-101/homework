from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Announcements ───────────────────────────────────────────────────────────
class AnnouncementCreate(BaseModel):
    title: str
    content: str


class AnnouncementOut(BaseModel):
    id: int
    course_id: int
    title: str
    content: str
    author_id: int
    author_name: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


# ── Discussions ─────────────────────────────────────────────────────────────
class DiscussionCreate(BaseModel):
    title: str
    body: str


class ReplyCreate(BaseModel):
    body: str


class ReplyOut(BaseModel):
    id: int
    discussion_id: int
    body: str
    author_id: int
    author_name: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


class DiscussionOut(BaseModel):
    id: int
    course_id: int
    title: str
    body: str
    author_id: int
    author_name: str = ""
    created_at: datetime
    replies: List[ReplyOut] = []

    class Config:
        from_attributes = True


# ── Syllabus ────────────────────────────────────────────────────────────────
class SyllabusWeekCreate(BaseModel):
    week_num: int
    title: str
    description: Optional[str] = None
    topics: Optional[str] = None   # newline-separated list


class SyllabusWeekOut(BaseModel):
    id: int
    course_id: int
    week_num: int
    title: str
    description: Optional[str] = None
    topics: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Groups ──────────────────────────────────────────────────────────────────
class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupMemberAdd(BaseModel):
    student_id: int


class GroupMemberOut(BaseModel):
    id: int
    student_id: int
    student_name: str = ""
    added_at: datetime

    class Config:
        from_attributes = True


class GroupOut(BaseModel):
    id: int
    course_id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    members: List[GroupMemberOut] = []

    class Config:
        from_attributes = True
