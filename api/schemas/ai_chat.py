from pydantic import BaseModel, Field
from typing import Optional, List


class SourceChunk(BaseModel):
    """
    A retrieved chunk used to ground the generated quizz questions
    """
    book_name: Optional[str] = Field(description="Name of the book or syllabus", default=None)
    page_number: Optional[List[int]] = Field(description="Relevant page numbers", default=None)
    content: str = Field(description="The chunk's text content")
    similarity_score: float = Field(description="Retrieval similarity score")


class ExternalSource(BaseModel):
    """One web result returned by the external search tool."""
    title: str
    url: str
    snippet: Optional[str] = None


class External_ressources(BaseModel):
    """Wrapper around the top external (web) sources used for a turn."""
    sources: List[ExternalSource] = Field(default_factory=list)


class ChatRequest(BaseModel):
    """
    Chat with AI
    """
    session_id: Optional[str] = Field(description="Session Id - omit to start a new chat session", default=None)
    question: str = Field(description="User question")


class ChatResponse(BaseModel):
    """
    AI Response
    """
    user_id: str = Field(description="User ID")
    session_id: str = Field(description="Session Id")
    question: str = Field(description="user provided questions")
    ai_response: str = Field(description="AI response")
    summary: Optional[str] = Field(description="Conversation summary after 5 turn", default=None)
    turn: int = 0
    sources: List[SourceChunk] = Field(description="Top 5 chunks retrieved to respond to user question")
    external_sources: Optional[External_ressources] = Field(description="Top 2 external sources used", default=None)


class ChatTurn(BaseModel):
    """
    One stored question/answer exchange within a chat session
    """
    turn: int
    question: str
    ai_response: str
    sources: List[SourceChunk] = Field(default_factory=list)
    external_sources: Optional[External_ressources] = None
    created_at: str


class ChatSessionSummary(BaseModel):
    """
    Lightweight listing entry for a user's chat sessions (sidebar view)
    """
    session_id: str
    user_id: str
    grade: str
    turn_count: int
    last_question: str
    summary: Optional[str] = None
    created_at: str
    updated_at: str


class ChatHistoryResponse(BaseModel):
    """
    Full chat session history
    """
    session_id: str
    user_id: str
    grade: str
    summary: Optional[str] = None
    turn_count: int
    messages: List[ChatTurn]
    created_at: str
    updated_at: str
