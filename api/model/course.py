from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from api.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    goals = Column(Text, nullable=True)
    subject = Column(String(100), nullable=False)
    grade_level = Column(String(20), nullable=True)
    facilitator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_public = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=True)
    cover_color = Column(String(20), default="#2f6df6")
    invite_code = Column(String(12), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    facilitator   = relationship("User", back_populates="taught_courses", foreign_keys=[facilitator_id])
    enrollments   = relationship("Enrollment", back_populates="course")
    assignments   = relationship("Assignment", back_populates="course")
    modules       = relationship("Module", back_populates="course", order_by="Module.order_num")
    messages      = relationship("Message", back_populates="course")
    invitations   = relationship("Invitation", back_populates="course")
    announcements = relationship("Announcement", back_populates="course",
                                  order_by="Announcement.created_at.desc()")
    discussions   = relationship("Discussion",   back_populates="course",
                                  order_by="Discussion.created_at.desc()")
    syllabus_weeks = relationship("SyllabusWeek", back_populates="course",
                                   order_by="SyllabusWeek.week_num")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    completed = Column(Boolean, default=False)
    progress_percent = Column(Integer, default=0)
    pass_status = Column(String(20), default="in_progress")  # in_progress / passed / retake

    student = relationship("User", back_populates="enrollments", foreign_keys=[student_id])
    course = relationship("Course", back_populates="enrollments")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending / accepted / declined
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="invitations")
    student = relationship("User", foreign_keys=[student_id])
    inviter = relationship("User", foreign_keys=[invited_by])


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=True)
    order_num = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="modules")
    completions = relationship("ModuleCompletion", back_populates="module")


class ModuleCompletion(Base):
    __tablename__ = "module_completions"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    student_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id   = Column(Integer, ForeignKey("modules.id"), nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow)

    module  = relationship("Module", back_populates="completions")
    student = relationship("User")
