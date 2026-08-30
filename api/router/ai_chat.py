from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.database import get_db
from api.schemas.ai_chat import ChatRequest, ChatResponse, ChatSessionSummary, ChatHistoryResponse
from api.controller import ai_chat_controller
from api.utils.auth import require_role
from api.model.user import User
from typing import List

router = APIRouter(prefix="/ai", tags=["AI Learning Assistant"])


@router.post("/chat", response_model=ChatResponse)
def chat(data: ChatRequest, db: Session = Depends(get_db),
         current_user: User = Depends(require_role("student"))):
    return ai_chat_controller.chat(data, current_user, db)


@router.get("/sessions", response_model=List[ChatSessionSummary])
def list_sessions(db: Session = Depends(get_db),
                   current_user: User = Depends(require_role("student"))):
    return ai_chat_controller.list_sessions(current_user, db)


@router.get("/sessions/{session_id}", response_model=ChatHistoryResponse)
def get_history(session_id: str, db: Session = Depends(get_db),
                 current_user: User = Depends(require_role("student"))):
    return ai_chat_controller.get_history(session_id, current_user, db)


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db),
                    current_user: User = Depends(require_role("student"))):
    return ai_chat_controller.delete_session(session_id, current_user, db)
