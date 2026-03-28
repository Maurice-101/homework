from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from api.database import Base


class Announcement(Base):
    __tablename__ = "announcements"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    course_id  = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title      = Column(String(200), nullable=False)
    content    = Column(Text, nullable=False)
    author_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    course  = relationship("Course", back_populates="announcements")
    author  = relationship("User")


class Discussion(Base):
    __tablename__ = "discussions"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    course_id  = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title      = Column(String(200), nullable=False)
    body       = Column(Text, nullable=False)
    author_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    course   = relationship("Course", back_populates="discussions")
    author   = relationship("User")
    replies  = relationship("DiscussionReply", back_populates="discussion",
                            order_by="DiscussionReply.created_at")


class DiscussionReply(Base):
    __tablename__ = "discussion_replies"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    discussion_id = Column(Integer, ForeignKey("discussions.id"), nullable=False)
    body          = Column(Text, nullable=False)
    author_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    discussion = relationship("Discussion", back_populates="replies")
    author     = relationship("User")


class SyllabusWeek(Base):
    __tablename__ = "syllabus_weeks"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    course_id   = Column(Integer, ForeignKey("courses.id"), nullable=False)
    week_num    = Column(Integer, nullable=False)
    title       = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    topics      = Column(Text, nullable=True)   # newline-separated
    created_at  = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="syllabus_weeks")


class CourseGroup(Base):
    __tablename__ = "course_groups"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    course_id   = Column(Integer, ForeignKey("courses.id"), nullable=False)
    name        = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    course   = relationship("Course")
    members  = relationship("GroupMember", back_populates="group",
                            cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    group_id   = Column(Integer, ForeignKey("course_groups.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    added_at   = Column(DateTime, default=datetime.utcnow)

    group   = relationship("CourseGroup", back_populates="members")
    student = relationship("User")
