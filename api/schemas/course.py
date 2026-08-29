from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    goals: Optional[str] = None
    subject: str
    grade_level: Optional[str] = None
    is_public: bool = False
    cover_color: Optional[str] = "#2f6df6"


class CourseOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    goals: Optional[str] = None
    subject: str
    grade_level: Optional[str] = None
    facilitator_id: Optional[int] = None
    is_public: bool
    is_approved: bool
    cover_color: Optional[str] = None
    invite_code: Optional[str] = None
    created_at: datetime
    facilitator_name: Optional[str] = None
    student_count: Optional[int] = 0

    class Config:
        from_attributes = True


class JoinCourseIn(BaseModel):
    code: str


class ModuleCreate(BaseModel):
    title: str
    content: Optional[str] = None
    order_num: int = 0


class ModuleOut(BaseModel):
    id: int
    course_id: int
    title: str
    content: Optional[str] = None
    order_num: int
    created_at: datetime

    class Config:
        from_attributes = True


class EnrollmentOut(BaseModel):
    id: int
    student_id: int
    course_id: int
    enrolled_at: datetime
    completed: bool
    progress_percent: int

    class Config:
        from_attributes = True


class InviteCreate(BaseModel):
    student_id: int
