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
    level: Optional[str] = "Beginner"
    duration_hours: Optional[int] = None
    status: Optional[str] = "active"
    target_grade_percent: Optional[int] = 80


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    goals: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    is_public: Optional[bool] = None
    level: Optional[str] = None
    duration_hours: Optional[int] = None
    status: Optional[str] = None
    target_grade_percent: Optional[int] = None


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
    level: Optional[str] = "Beginner"
    duration_hours: Optional[int] = None
    course_code: Optional[str] = None
    thumbnail_path: Optional[str] = None
    status: Optional[str] = "active"
    target_grade_percent: Optional[int] = 80
    created_at: datetime
    facilitator_name: Optional[str] = None
    student_count: Optional[int] = 0
    active_assignment_count: Optional[int] = 0
    grading_due: bool = False
    avg_progress_percent: Optional[float] = None

    class Config:
        from_attributes = True


class JoinCourseIn(BaseModel):
    code: str


class TeamMemberIn(BaseModel):
    user_id: int
    role: str = "ta"  # co_facilitator / ta


class TeamMemberOut(BaseModel):
    id: int
    course_id: int
    user_id: int
    role: str
    added_at: datetime
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class MeetingCreate(BaseModel):
    student_id: Optional[int] = None
    scheduled_at: datetime
    duration_minutes: int = 30
    notes: Optional[str] = None


class MeetingOut(BaseModel):
    id: int
    course_id: int
    facilitator_id: int
    student_id: Optional[int] = None
    scheduled_at: datetime
    duration_minutes: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    student_name: Optional[str] = None

    class Config:
        from_attributes = True


class WeekPointOut(BaseModel):
    week_start: str
    avg_grade_percent: float


class SubjectPerformanceOut(BaseModel):
    course_id: int
    title: str
    avg_grade_percent: Optional[float] = None
    target_grade_percent: int = 80


class ProgressAnalyticsOut(BaseModel):
    avg_class_grade_percent: Optional[float] = None
    avg_class_grade_trend: Optional[float] = None
    assignment_completion_percent: Optional[float] = None
    assignment_completion_trend: Optional[float] = None
    at_risk_count: int = 0
    avg_grading_time_hours: Optional[float] = None
    avg_grading_time_trend: Optional[float] = None
    target_grade_percent: int = 80
    weekly_series: list = []
    subject_performance: list = []


class StudentOverviewOut(BaseModel):
    student_id: int
    first_name: str
    last_name: str
    email: str
    courses: list
    avg_grade_percent: Optional[float] = None
    trend: str = "flat"  # up / down / flat
    last_activity: Optional[datetime] = None
    at_risk: bool = False
    recent_activity: list = []


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
