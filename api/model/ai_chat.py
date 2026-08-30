from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from api.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    session_id = Column(String(32), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    grade = Column(String(20), nullable=True)
    summary = Column(Text, nullable=True)
    turn_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    messages = relationship("ChatMessage", back_populates="session",
                             order_by="ChatMessage.turn", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(32), ForeignKey("chat_sessions.session_id"), nullable=False)
    turn = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    sources = Column(Text, nullable=True)            # JSON-array of SourceChunk dicts
    external_sources = Column(Text, nullable=True)    # JSON dict (External_ressources), nullable
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")
