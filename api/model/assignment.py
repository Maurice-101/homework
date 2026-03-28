from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from api.database import Base


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

    course = relationship("Course", back_populates="assignments")
    creator = relationship("User", back_populates="assignments_created")
    submissions = relationship("Submission", back_populates="assignment")


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

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")
