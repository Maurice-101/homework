from pydantic import BaseModel, computed_field
from typing import Optional
from datetime import datetime


class MessageCreate(BaseModel):
    receiver_id: Optional[int] = None
    recipient_id: Optional[int] = None  # alias accepted from frontend
    course_id: Optional[int] = None
    subject: Optional[str] = None
    content: str


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: Optional[int] = None
    course_id: Optional[int] = None
    subject: Optional[str] = None
    content: str
    is_read: bool
    sent_at: datetime
    sender_name: Optional[str] = None

    @computed_field
    @property
    def created_at(self) -> datetime:
        return self.sent_at

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CanvasNoteCreate(BaseModel):
    title: str = "Untitled Page"
    content: str = ""
    page: int = 1
    book_id: Optional[int] = None


class CanvasNoteOut(BaseModel):
    id: int
    student_id: int
    book_id: Optional[int] = None
    title: str
    content: str
    page: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CanvasBookCreate(BaseModel):
    title: str = "My Notebook"


class CanvasBookOut(BaseModel):
    id: int
    student_id: int
    title: str
    created_at: datetime
    page_count: int = 0

    class Config:
        from_attributes = True
