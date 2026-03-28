from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.database import get_db
from api.schemas.message import MessageCreate, CanvasNoteCreate, CanvasBookCreate
from api.controller import message_controller
from api.utils.auth import get_current_user
from api.model.user import User

router = APIRouter(tags=["Communication"])


@router.post("/messages")
def send(data: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_controller.send_message(data, current_user.id, db)


@router.get("/messages/inbox")
def inbox(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_controller.get_inbox(current_user.id, db)


@router.get("/messages/sent")
def sent(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_controller.get_sent(current_user.id, db)


@router.get("/messages/contacts")
def contacts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_controller.get_contacts(current_user.id, db)


@router.get("/messages/course/{course_id}")
def course_chat(course_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    return message_controller.get_course_chat(course_id, db)


@router.get("/messages/conversation/{other_id}")
def conversation(other_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    return message_controller.get_conversation(current_user.id, other_id, db)


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_controller.get_notifications(current_user.id, db)


@router.put("/notifications/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_controller.mark_all_read(current_user.id, db)


@router.put("/notifications/{notif_id}/read")
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_controller.mark_read(notif_id, current_user.id, db)


@router.get("/canvas")
def get_notes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_controller.get_notes(current_user.id, db)


@router.post("/canvas")
def create_note(data: CanvasNoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_controller.create_note(current_user.id, data, db)


@router.put("/canvas/{note_id}")
def update_note(note_id: int, data: CanvasNoteCreate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    return message_controller.update_note(note_id, current_user.id, data, db)


@router.delete("/canvas/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    return message_controller.delete_note(note_id, current_user.id, db)


# ── Canvas Books ──────────────────────────────────────────────────────────────
@router.get("/canvas/books")
def get_books(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_controller.get_books(current_user.id, db)


@router.post("/canvas/books")
def create_book(data: CanvasBookCreate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    return message_controller.create_book(current_user.id, data, db)


@router.put("/canvas/books/{book_id}")
def rename_book(book_id: int, data: CanvasBookCreate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    return message_controller.rename_book(book_id, current_user.id, data, db)


@router.delete("/canvas/books/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    return message_controller.delete_book(book_id, current_user.id, db)


@router.get("/canvas/books/{book_id}/pages")
def get_book_pages(book_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    return message_controller.get_book_pages(book_id, current_user.id, db)


@router.post("/canvas/books/{book_id}/pages")
def add_page(book_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    return message_controller.add_page_to_book(book_id, current_user.id, db)


@router.delete("/canvas/books/{book_id}/pages/{page_id}")
def delete_page(book_id: int, page_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    return message_controller.delete_page_from_book(book_id, page_id, current_user.id, db)
