from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from api.database import Base


class CanvasBook(Base):
    __tablename__ = "canvas_books"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title      = Column(String(200), nullable=False, default="My Notebook")
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User")
    pages   = relationship("CanvasNote", back_populates="book",
                           order_by="CanvasNote.page",
                           cascade="all, delete-orphan")


class CanvasNote(Base):
    __tablename__ = "canvas_notes"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    book_id    = Column(Integer, ForeignKey("canvas_books.id"), nullable=True)
    title      = Column(String(200), nullable=False, default="Untitled Page")
    content    = Column(Text, nullable=True, default="")
    page       = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("User", back_populates="canvas_notes")
    book    = relationship("CanvasBook", back_populates="pages")
