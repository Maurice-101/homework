"""RAG pipeline for the AI learning assistant.

Retrieval is orchestrated by Haystack — a DeepInfra text embedder feeding a
Qdrant embedding retriever against the pre-populated "FoundationX" collection
(36k+ chunks already indexed from the platform's study-material library; no
ingestion happens here, this module only queries it). Generation is
orchestrated by LiteLLM — Gemini 2.5 via OpenRouter, falling back to a direct
Gemini call if OpenRouter errors out after retrying.
"""
import time
from typing import List, Optional

from haystack import Pipeline
from haystack.components.embedders import OpenAITextEmbedder
from haystack.utils import Secret
from haystack_integrations.document_stores.qdrant import QdrantDocumentStore
from haystack_integrations.components.retrievers.qdrant import QdrantEmbeddingRetriever

from api.settings import settings
from api.schemas.ai_chat import SourceChunk, External_ressources

_pipeline: Optional[Pipeline] = None


def _build_pipeline() -> Pipeline:
    store = QdrantDocumentStore(
        url=settings.qdrant_url,
        api_key=Secret.from_token(settings.qdrant_api_key),
        index=settings.qdrant_collection_name,
        embedding_dim=settings.dimension,
        recreate_index=False,
        timeout=settings.qdrant_timeout,
    )
    embedder = OpenAITextEmbedder(
        api_key=Secret.from_token(settings.deep_infra_key),
        model=settings.model_embedder,
        api_base_url="https://api.deepinfra.com/v1/openai",
    )
    retriever = QdrantEmbeddingRetriever(document_store=store, top_k=settings.top_k)

    pipe = Pipeline()
    pipe.add_component("embedder", embedder)
    pipe.add_component("retriever", retriever)
    pipe.connect("embedder.embedding", "retriever.query_embedding")
    return pipe


def _get_pipeline() -> Pipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = _build_pipeline()
    return _pipeline


def retrieve(question: str) -> List[SourceChunk]:
    """Run the Haystack retrieval pipeline; return the top-k chunks as SourceChunk."""
    try:
        result = _get_pipeline().run({"embedder": {"text": question}})
        docs = result["retriever"]["documents"]
    except Exception:
        return []
    chunks = []
    for d in docs:
        meta = d.meta or {}
        page = meta.get("page_number")
        chunks.append(SourceChunk(
            book_name=meta.get("file_name"),
            page_number=[page] if isinstance(page, int) else None,
            content=d.content or "",
            similarity_score=d.score or 0.0,
        ))
    return chunks


SYSTEM_PROMPT = """You are a friendly, patient AI learning assistant for students on the Abahizi \
learning platform. Answer clearly and at a level appropriate for a secondary-school student.

When the provided study material excerpts below are relevant, ground your answer in them and \
mention which book/source they came from. If the excerpts don't cover the question, say so \
plainly and answer from your own knowledge instead of pretending they do. Keep answers focused \
and well-structured (short paragraphs or bullet points where helpful)."""


def _build_context_block(chunks: List[SourceChunk]) -> str:
    if not chunks:
        return "(No relevant study material excerpts were found for this question.)"
    parts = []
    for c in chunks:
        label = c.book_name or "Unknown source"
        pages = f" (p. {', '.join(str(p) for p in c.page_number)})" if c.page_number else ""
        parts.append(f"[{label}{pages}]\n{c.content.strip()}")
    return "\n\n".join(parts)


def _build_history_block(history: List[dict], summary: Optional[str]) -> str:
    if not history and not summary:
        return ""
    parts = []
    if summary:
        parts.append(f"Conversation so far (summary): {summary}")
    for turn in history:
        parts.append(f"Student: {turn['question']}\nAssistant: {turn['ai_response']}")
    return "\n\n".join(parts)


def _api_key_for(model: str) -> Optional[str]:
    if model.startswith("openrouter/"):
        return settings.open_router_key or None
    if model.startswith("gemini/"):
        return settings.google_api_key or None
    return None


def generate_answer(question: str, chunks: List[SourceChunk],
                     external: Optional[External_ressources],
                     history: List[dict], summary: Optional[str]) -> str:
    """Call LiteLLM (Gemini 2.5 via OpenRouter, falling back to direct Gemini) for the answer."""
    import litellm

    context_block = _build_context_block(chunks)
    history_block = _build_history_block(history, summary)

    external_block = ""
    if external and external.sources:
        external_block = "\n\nRelevant web sources:\n" + "\n".join(
            f"- {s.title}: {s.snippet or ''}" for s in external.sources
        )

    user_content = (
        (f"{history_block}\n\n" if history_block else "")
        + f"Study material excerpts:\n{context_block}{external_block}\n\n"
        + f"Student's question: {question}"
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    last_err = None
    for model in (settings.llm_model, settings.llm_model_fallback):
        if not model:
            continue
        for attempt in range(settings.llm_max_retries + 1):
            try:
                resp = litellm.completion(
                    model=model, messages=messages, max_tokens=900,
                    api_key=_api_key_for(model),
                )
                return resp.choices[0].message.content
            except Exception as e:
                last_err = e
                if attempt < settings.llm_max_retries:
                    time.sleep(settings.llm_retry_delay)
    raise RuntimeError(f"AI assistant is temporarily unavailable: {last_err}")


def summarize_session(history: List[dict]) -> str:
    """Condense the conversation so far into a short summary for future-turn context."""
    import litellm

    convo = "\n".join(f"Student: {t['question']}\nAssistant: {t['ai_response']}" for t in history)
    messages = [
        {"role": "system", "content": "Summarize this tutoring conversation in 2-3 sentences, "
                                       "capturing the topics covered and the student's level of "
                                       "understanding so far. Be concise."},
        {"role": "user", "content": convo},
    ]
    for model in (settings.llm_model, settings.llm_model_fallback):
        if not model:
            continue
        try:
            resp = litellm.completion(
                model=model, messages=messages, max_tokens=200,
                api_key=_api_key_for(model),
            )
            return resp.choices[0].message.content
        except Exception:
            continue
    return ""
