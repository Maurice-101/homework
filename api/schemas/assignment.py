from pydantic import BaseModel, model_validator, computed_field
from typing import Optional
from datetime import datetime


class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    course_id: Optional[int] = None
    due_date: Optional[datetime] = None
    assignment_type: str = "assignment"   # sent by frontend
    type: Optional[str] = None            # fallback column name
    max_score: float = 100.0
    is_published: bool = True
    attachment_url: Optional[str] = None  # optional link / Google Doc

    @model_validator(mode="after")
    def normalize_type(self):
        if not self.type:
            self.type = self.assignment_type
        elif not self.assignment_type:
            self.assignment_type = self.type
        return self


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    assignment_type: Optional[str] = None
    max_score: Optional[float] = None
    is_published: Optional[bool] = None
    attachment_url: Optional[str] = None  # optional link / Google Doc


class AssignmentOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    course_id: Optional[int] = None
    created_by: int
    due_date: Optional[datetime] = None
    type: str = "assignment"
    max_score: float
    is_published: bool
    created_at: datetime
    attachment_url: Optional[str] = None
    attachment_path: Optional[str] = None
    course_title: Optional[str] = None
    # student view extras
    student_grade: Optional[float] = None
    student_feedback: Optional[str] = None
    student_submission_id: Optional[int] = None
    student_submission_type: Optional[str] = None
    student_content: Optional[str] = None
    student_file_path: Optional[str] = None

    @computed_field
    @property
    def assignment_type(self) -> str:
        return self.type

    class Config:
        from_attributes = True


class SubmissionCreate(BaseModel):
    content: Optional[str] = None
    submission_type: str = "text"     # text | link | pdf


class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    submission_type: str = "text"
    content: Optional[str] = None
    file_path: Optional[str] = None
    submitted_at: datetime
    grade: Optional[float] = None
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None
    student_name: Optional[str] = None
    assignment_title: Optional[str] = None

    class Config:
        from_attributes = True


class GradeSubmission(BaseModel):
    grade: float
    feedback: Optional[str] = None
