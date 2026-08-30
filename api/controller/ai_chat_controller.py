import json
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from api.model.ai_chat import ChatSession, ChatMessage
from api.model.user import User
from api.schemas.ai_chat import (
    ChatRequest, ChatResponse, ChatTurn, ChatSessionSummary, ChatHistoryResponse,
    SourceChunk, External_ressources,
)
from api.services import rag_chat
from api.external_ressources.tavily_search import search_external

SUMMARY_EVERY_N_TURNS = 5


def _get_owned_session(session_id: str, user_id: int, db: Session) -> ChatSession:
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id, ChatSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


def _encode_sources(chunks: List[SourceChunk]) -> str:
    return json.dumps([c.model_dump() for c in chunks])


def _decode_sources(raw: Optional[str]) -> List[SourceChunk]:
    if not raw:
        return []
    try:
        return [SourceChunk(**d) for d in json.loads(raw)]
    except (json.JSONDecodeError, TypeError):
        return []


def _encode_external(ext: Optional[External_ressources]) -> Optional[str]:
    if not ext:
        return None
    return json.dumps(ext.model_dump())


def _decode_external(raw: Optional[str]) -> Optional[External_ressources]:
    if not raw:
        return None
    try:
        return External_ressources(**json.loads(raw))
    except (json.JSONDecodeError, TypeError):
        return None


def chat(data: ChatRequest, user: User, db: Session) -> ChatResponse:
    if data.session_id:
        session = _get_owned_session(data.session_id, user.id, db)
    else:
        session = ChatSession(session_id=uuid.uuid4().hex, user_id=user.id, grade=user.grade or "")
        db.add(session)
        db.flush()

    prior = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.session_id
    ).order_by(ChatMessage.turn).all()
    history_dicts = [{"question": m.question, "ai_response": m.ai_response} for m in prior]
    context_history = history_dicts[-2:] if session.summary else history_dicts

    chunks = rag_chat.retrieve(data.question)
    external = search_external(data.question)
    ai_response = rag_chat.generate_answer(
        data.question, chunks, external, context_history, session.summary,
    )

    next_turn = session.turn_count + 1
    message = ChatMessage(
        session_id=session.session_id, turn=next_turn,
        question=data.question, ai_response=ai_response,
        sources=_encode_sources(chunks), external_sources=_encode_external(external),
    )
    db.add(message)
    session.turn_count = next_turn
    session.updated_at = datetime.utcnow()

    summary_out = None
    if next_turn % SUMMARY_EVERY_N_TURNS == 0:
        full_history = history_dicts + [{"question": data.question, "ai_response": ai_response}]
        summary_out = rag_chat.summarize_session(full_history) or None
        if summary_out:
            session.summary = summary_out

    db.commit()

    return ChatResponse(
        user_id=str(user.id), session_id=session.session_id,
        question=data.question, ai_response=ai_response,
        summary=summary_out, turn=next_turn,
        sources=chunks, external_sources=external,
    )


def list_sessions(user: User, db: Session) -> List[ChatSessionSummary]:
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == user.id
    ).order_by(ChatSession.updated_at.desc()).all()
    out = []
    for s in sessions:
        last = db.query(ChatMessage).filter(
            ChatMessage.session_id == s.session_id
        ).order_by(ChatMessage.turn.desc()).first()
        out.append(ChatSessionSummary(
            session_id=s.session_id, user_id=str(s.user_id), grade=s.grade or "",
            turn_count=s.turn_count, last_question=last.question if last else "",
            summary=s.summary,
            created_at=s.created_at.isoformat() if s.created_at else "",
            updated_at=s.updated_at.isoformat() if s.updated_at else "",
        ))
    return out


def get_history(session_id: str, user: User, db: Session) -> ChatHistoryResponse:
    session = _get_owned_session(session_id, user.id, db)
    msgs = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.turn).all()
    return ChatHistoryResponse(
        session_id=session.session_id, user_id=str(session.user_id), grade=session.grade or "",
        summary=session.summary, turn_count=session.turn_count,
        messages=[
            ChatTurn(
                turn=m.turn, question=m.question, ai_response=m.ai_response,
                sources=_decode_sources(m.sources),
                external_sources=_decode_external(m.external_sources),
                created_at=m.created_at.isoformat() if m.created_at else "",
            ) for m in msgs
        ],
        created_at=session.created_at.isoformat() if session.created_at else "",
        updated_at=session.updated_at.isoformat() if session.updated_at else "",
    )


def delete_session(session_id: str, user: User, db: Session) -> dict:
    session = _get_owned_session(session_id, user.id, db)
    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted"}
