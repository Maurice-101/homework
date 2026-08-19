from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from api.database import Base

# Question types supported by the assignment builder. Kept as a plain string
# column (not a DB enum) so new types can be added later without a migration.
QUESTION_TYPES = (
    "short_answer", "long_answer", "multiple_choice", "multiple_select",
    "true_false", "dropdown", "matching", "file_upload",
)
AUTO_GRADED_TYPES = {"multiple_choice", "multiple_select", "true_false", "dropdown", "matching"}


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    due_date = Column(DateTime, nullable=True)
    type = Column(String(30), default="assignment")  # assignment|quiz|exam|mock
    max_score = Column(Float, default=100.0)
    is_published = Column(Boolean, default=True)
    attachment_url  = Column(String(500), nullable=True)   # optional link / Google Doc
    attachment_path = Column(String(500), nullable=True)   # optional uploaded PDF
    created_at = Column(DateTime, default=datetime.utcnow)

    # ── Question-builder settings ──────────────────────────────────────────
    status = Column(String(20), default="draft")  # draft | published | closed
    available_from = Column(DateTime, nullable=True)
    time_limit_minutes = Column(Integer, nullable=True)
    max_attempts = Column(Integer, default=1)
    randomize_questions = Column(Boolean, default=False)
    randomize_choices = Column(Boolean, default=False)

    course = relationship("Course", back_populates="assignments")
    creator = relationship("User", back_populates="assignments_created")
    submissions = relationship("Submission", back_populates="assignment")
    attachments = relationship("AssignmentAttachment", back_populates="assignment",
                               cascade="all, delete-orphan", order_by="AssignmentAttachment.id")
    questions = relationship("AssignmentQuestion", back_populates="assignment",
                             cascade="all, delete-orphan", order_by="AssignmentQuestion.order_num")


class AssignmentAttachment(Base):
    __tablename__ = "assignment_attachments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship("Assignment", back_populates="attachments")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    submission_type = Column(String(20), default="text")  # text | link | pdf
    content = Column(Text, nullable=True)          # text answer OR URL for link submissions
    file_path = Column(String(500), nullable=True) # relative path for uploaded PDFs
    submitted_at = Column(DateTime, default=datetime.utcnow)
    grade = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_at = Column(DateTime, nullable=True)
    attempt_number = Column(Integer, default=1)

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")
    answers = relationship("QuestionResponse", back_populates="submission",
                           cascade="all, delete-orphan", order_by="QuestionResponse.id")


class AssignmentQuestion(Base):
    __tablename__ = "assignment_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    text = Column(Text, nullable=False)
    type = Column(String(30), nullable=False, default="short_answer")
    points = Column(Float, default=1.0)
    required = Column(Boolean, default=True)
    order_num = Column(Integer, default=0)

    assignment = relationship("Assignment", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question",
                           cascade="all, delete-orphan", order_by="QuestionOption.order_num")


class QuestionOption(Base):
    """A choice for multiple_choice/multiple_select/dropdown/true_false, or one
    side of a pair for matching questions (text = left item, match_value = the
    right-hand answer it should be matched to)."""
    __tablename__ = "question_options"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("assignment_questions.id"), nullable=False)
    text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    match_value = Column(Text, nullable=True)
    order_num = Column(Integer, default=0)

    question = relationship("AssignmentQuestion", back_populates="options")


class QuestionResponse(Base):
    """A student's answer to one question within a submission."""
    __tablename__ = "question_responses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("assignment_questions.id"), nullable=False)
    answer_text = Column(Text, nullable=True)             # short_answer / long_answer
    selected_option_ids = Column(JSON, nullable=True)      # multiple_choice/select/dropdown/true_false
    matching_answers = Column(JSON, nullable=True)         # matching: {left_option_id: chosen_text}
    file_path = Column(String(500), nullable=True)         # file_upload
    is_correct = Column(Boolean, nullable=True)             # auto-graded objective types; null if n/a
    points_awarded = Column(Float, nullable=True)

    submission = relationship("Submission", back_populates="answers")
    question = relationship("AssignmentQuestion")
