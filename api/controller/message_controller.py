from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List
from api.model.message import Message
from api.model.notification import Notification
from api.model.user import User
from api.model.canvas import CanvasNote, CanvasBook
from api.schemas.message import (MessageCreate, MessageOut, NotificationOut,
                                  CanvasNoteCreate, CanvasNoteOut,
                                  CanvasBookCreate, CanvasBookOut)


def send_message(data: MessageCreate, sender_id: int, db: Session) -> MessageOut:
    receiver_id = data.receiver_id or data.recipient_id
    if not receiver_id and not data.course_id:
        raise HTTPException(status_code=400, detail="Provide receiver_id or course_id")
    msg = Message(sender_id=sender_id, receiver_id=receiver_id,
                  course_id=data.course_id, content=data.content)
    db.add(msg)
    if receiver_id:
        db.add(Notification(user_id=receiver_id, title="New Message",
                            message="You have a new message.", type="message"))
    db.commit()
    db.refresh(msg)
    out = MessageOut.model_validate(msg)
    sender = db.query(User).filter(User.id == sender_id).first()
    if sender:
        out.sender_name = f"{sender.first_name} {sender.last_name}"
    return out


def get_inbox(user_id: int, db: Session) -> List[MessageOut]:
    msgs = db.query(Message).filter(Message.receiver_id == user_id).order_by(Message.sent_at.desc()).all()
    result = []
    for m in msgs:
        out = MessageOut.model_validate(m)
        if m.sender:
            out.sender_name = f"{m.sender.first_name} {m.sender.last_name}"
        result.append(out)
    return result


def get_sent(user_id: int, db: Session) -> List[MessageOut]:
    msgs = db.query(Message).filter(Message.sender_id == user_id).order_by(Message.sent_at.desc()).all()
    result = []
    for m in msgs:
        out = MessageOut.model_validate(m)
        if m.sender:
            out.sender_name = f"{m.sender.first_name} {m.sender.last_name}"
        result.append(out)
    return result


def get_course_chat(course_id: int, db: Session) -> List[MessageOut]:
    msgs = (db.query(Message)
              .filter(Message.course_id == course_id, Message.receiver_id == None)
              .order_by(Message.sent_at.asc())
              .all())
    result = []
    for m in msgs:
        out = MessageOut.model_validate(m)
        if m.sender:
            out.sender_name = f"{m.sender.first_name} {m.sender.last_name}"
        result.append(out)
    return result


def get_contacts(user_id: int, db: Session) -> list:
    """Return conversation partners with last message preview and unread count."""
    from sqlalchemy import or_, func, case
    # Find all unique conversation partners
    sent = db.query(Message.receiver_id.label("other_id")).filter(Message.sender_id == user_id)
    recv = db.query(Message.sender_id.label("other_id")).filter(Message.receiver_id == user_id)
    partner_ids = {r.other_id for r in sent.union(recv).all()}

    contacts = []
    for pid in partner_ids:
        partner = db.query(User).filter(User.id == pid).first()
        if not partner:
            continue
        # latest message between the two
        last_msg = db.query(Message).filter(
            or_(
                (Message.sender_id == user_id) & (Message.receiver_id == pid),
                (Message.sender_id == pid) & (Message.receiver_id == user_id),
            )
        ).order_by(Message.sent_at.desc()).first()
        unread = db.query(func.count(Message.id)).filter(
            Message.sender_id == pid,
            Message.receiver_id == user_id,
            Message.is_read == False,
        ).scalar()
        contacts.append({
            "user_id": pid,
            "name": f"{partner.first_name} {partner.last_name}",
            "initials": (partner.first_name[:1] + partner.last_name[:1]).upper(),
            "role": partner.role,
            "last_message": last_msg.content if last_msg else "",
            "last_time": last_msg.sent_at.isoformat() if last_msg else "",
            "unread": unread,
        })
    contacts.sort(key=lambda c: c["last_time"], reverse=True)
    return contacts


def get_conversation(user_id: int, other_id: int, db: Session) -> list:
    """Return full message thread between two users and mark incoming as read."""
    from sqlalchemy import or_
    msgs = db.query(Message).filter(
        or_(
            (Message.sender_id == user_id) & (Message.receiver_id == other_id),
            (Message.sender_id == other_id) & (Message.receiver_id == user_id),
        )
    ).order_by(Message.sent_at.asc()).all()

    # Mark unread messages from other_id as read
    for m in msgs:
        if m.receiver_id == user_id and not m.is_read:
            m.is_read = True
    db.commit()

    result = []
    for m in msgs:
        result.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "content": m.content,
            "sent_at": m.sent_at.isoformat(),
            "is_read": m.is_read,
            "is_mine": m.sender_id == user_id,
        })
    return result


def get_notifications(user_id: int, db: Session) -> List[NotificationOut]:
    notifs = db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).all()
    return [NotificationOut.model_validate(n) for n in notifs]


def mark_read(notif_id: int, user_id: int, db: Session) -> dict:
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == user_id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"message": "Marked as read"}


def mark_all_read(user_id: int, db: Session) -> dict:
    db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All marked as read"}


MAX_PAGES_PER_BOOK = 100


# ── Legacy / standalone notes (no book) ──────────────────────────────────────
def get_notes(student_id: int, db: Session) -> List[CanvasNoteOut]:
    return [CanvasNoteOut.model_validate(n) for n in
            db.query(CanvasNote).filter(CanvasNote.student_id == student_id).all()]


def create_note(student_id: int, data: CanvasNoteCreate, db: Session) -> CanvasNoteOut:
    note = CanvasNote(student_id=student_id, title=data.title,
                      content=data.content, page=data.page, book_id=data.book_id)
    db.add(note)
    db.commit()
    db.refresh(note)
    return CanvasNoteOut.model_validate(note)


def update_note(note_id: int, student_id: int, data: CanvasNoteCreate, db: Session) -> CanvasNoteOut:
    note = db.query(CanvasNote).filter(CanvasNote.id == note_id,
                                        CanvasNote.student_id == student_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.title   = data.title
    note.content = data.content
    note.page    = data.page
    db.commit()
    db.refresh(note)
    return CanvasNoteOut.model_validate(note)


def delete_note(note_id: int, student_id: int, db: Session):
    note = db.query(CanvasNote).filter(CanvasNote.id == note_id,
                                        CanvasNote.student_id == student_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"message": "Deleted"}


# ── Books ─────────────────────────────────────────────────────────────────────
def _book_out(book: CanvasBook) -> CanvasBookOut:
    return CanvasBookOut(
        id=book.id, student_id=book.student_id, title=book.title,
        created_at=book.created_at, page_count=len(book.pages),
    )


def get_books(student_id: int, db: Session) -> List[CanvasBookOut]:
    books = db.query(CanvasBook).filter(CanvasBook.student_id == student_id).all()
    return [_book_out(b) for b in books]


def create_book(student_id: int, data: CanvasBookCreate, db: Session) -> CanvasBookOut:
    book = CanvasBook(student_id=student_id, title=data.title)
    db.add(book)
    db.commit()
    db.refresh(book)
    # Auto-create first page
    page = CanvasNote(student_id=student_id, book_id=book.id,
                      title="Page 1", content="", page=1)
    db.add(page)
    db.commit()
    db.refresh(book)
    return _book_out(book)


def rename_book(book_id: int, student_id: int, data: CanvasBookCreate, db: Session) -> CanvasBookOut:
    book = db.query(CanvasBook).filter(CanvasBook.id == book_id,
                                        CanvasBook.student_id == student_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    book.title = data.title
    db.commit()
    db.refresh(book)
    return _book_out(book)


def delete_book(book_id: int, student_id: int, db: Session):
    book = db.query(CanvasBook).filter(CanvasBook.id == book_id,
                                        CanvasBook.student_id == student_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(book)
    db.commit()
    return {"message": "Deleted"}


def get_book_pages(book_id: int, student_id: int, db: Session) -> List[CanvasNoteOut]:
    book = db.query(CanvasBook).filter(CanvasBook.id == book_id,
                                        CanvasBook.student_id == student_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return [CanvasNoteOut.model_validate(p) for p in book.pages]


def add_page_to_book(book_id: int, student_id: int, db: Session) -> CanvasNoteOut:
    book = db.query(CanvasBook).filter(CanvasBook.id == book_id,
                                        CanvasBook.student_id == student_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if len(book.pages) >= MAX_PAGES_PER_BOOK:
        raise HTTPException(status_code=400,
                            detail=f"Maximum {MAX_PAGES_PER_BOOK} pages per book reached")
    next_page_num = max((p.page for p in book.pages), default=0) + 1
    page = CanvasNote(student_id=student_id, book_id=book_id,
                      title=f"Page {next_page_num}", content="", page=next_page_num)
    db.add(page)
    db.commit()
    db.refresh(page)
    return CanvasNoteOut.model_validate(page)


def delete_page_from_book(book_id: int, page_id: int, student_id: int, db: Session):
    book = db.query(CanvasBook).filter(CanvasBook.id == book_id,
                                        CanvasBook.student_id == student_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if len(book.pages) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only page in a book")
    page = db.query(CanvasNote).filter(CanvasNote.id == page_id,
                                        CanvasNote.book_id == book_id,
                                        CanvasNote.student_id == student_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    db.delete(page)
    db.commit()
    return {"message": "Deleted"}
