from pydantic import BaseModel, model_validator, computed_field
from typing import Optional, List, Dict
from datetime import datetime


class OptionIn(BaseModel):
    id: Optional[int] = None          # present when editing an existing option
    text: str
    is_correct: bool = False
    match_value: Optional[str] = None  # matching questions: the right-hand answer
    order_num: int = 0


class QuestionIn(BaseModel):
    id: Optional[int] = None          # present when editing an existing question
    text: str
    type: str = "short_answer"
    points: float = 1.0
    required: bool = True
    order_num: int = 0
    options: List[OptionIn] = []


class QuestionsSetIn(BaseModel):
    questions: List[QuestionIn] = []


class AnswerIn(BaseModel):
    question_id: int
    answer_text: Optional[str] = None
    selected_option_ids: Optional[List[int]] = None
    matching_answers: Optional[Dict[str, str]] = None


class AnswersSubmitIn(BaseModel):
    answers: List[AnswerIn] = []


class GradeAnswer(BaseModel):
    points_awarded: float


class AttachmentOut(BaseModel):
    id: int
    filename: str
    file_path: str

    class Config:
        from_attributes = True


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
    status: str = "draft"                 # draft | published | closed
    available_from: Optional[datetime] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: int = 1
    randomize_questions: bool = False
    randomize_choices: bool = False

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
    status: Optional[str] = None
    available_from: Optional[datetime] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    randomize_questions: Optional[bool] = None
    randomize_choices: Optional[bool] = None


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
    attachments: List[AttachmentOut] = []
    course_title: Optional[str] = None
    status: str = "draft"
    available_from: Optional[datetime] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: int = 1
    randomize_questions: bool = False
    randomize_choices: bool = False
    question_count: int = 0
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
    submission_type: str = "text"     # text | link | file (legacy submissions may say "pdf")


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
    attempt_number: int = 1
    answers: list = []   # populated for question-based assignments; each item is a plain dict

    class Config:
        from_attributes = True


class GradeSubmission(BaseModel):
    grade: float
    feedback: Optional[str] = None
