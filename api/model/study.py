from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from api.database import Base


class StudySession(Base):
    """One row per student per calendar day per course (course_id is null for time spent
    outside any specific course — dashboard, general assignments list, etc. — bucketed as
    "General" for display), accumulated by periodic pings from the frontend while a page
    is open and the tab is visible. Minutes are only ever incremented server-side by a
    fixed, bounded step per ping — the client never reports a duration directly — so a
    malicious or buggy client can't inflate it."""
    __tablename__ = "study_sessions"
    __table_args__ = (UniqueConstraint("student_id", "date", "course_id", name="uq_study_session_student_date_course"),)

    id         = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id  = Column(Integer, ForeignKey("courses.id"), nullable=True)
    date       = Column(Date, nullable=False)
    minutes    = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("User")
    course  = relationship("Course")
