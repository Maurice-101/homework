from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from api.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # student | facilitator | admin
    school = Column(String(200), nullable=True)
    grade = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    nationality = Column(String(100), nullable=True)
    languages_spoken = Column(Text, nullable=True)  # JSON-array string
    goals = Column(Text, nullable=True)             # JSON-array string
    bio = Column(Text, nullable=True)
    avatar = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    enrollments = relationship("Enrollment", back_populates="student", foreign_keys="Enrollment.student_id")
    taught_courses = relationship("Course", back_populates="facilitator", foreign_keys="Course.facilitator_id")
    assignments_created = relationship("Assignment", back_populates="creator")
    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    received_messages = relationship("Message", back_populates="receiver", foreign_keys="Message.receiver_id")
    notifications = relationship("Notification", back_populates="user")
    canvas_notes = relationship("CanvasNote", back_populates="student")
    submissions = relationship("Submission", back_populates="student")
