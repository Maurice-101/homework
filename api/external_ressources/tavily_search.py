"""External (web) search augmentation for the AI learning assistant, via Tavily.

Kept separate from the internal RAG pipeline (api/services/rag_chat.py) since
it's a supplementary, best-effort enrichment — a Tavily failure should never
take down a chat turn, only mean external_sources comes back None.
"""
from typing import Optional

from api.schemas.ai_chat import ExternalSource, External_ressources
from api.settings import settings

_MAX_EXTERNAL_SOURCES = 2

_client = None


def _get_client():
    global _client
    if _client is None:
        from tavily import TavilyClient
        _client = TavilyClient(api_key=settings.tavily_api_key)
    return _client


def search_external(question: str) -> Optional[External_ressources]:
    """Best-effort Tavily search for the top external sources on this question."""
    if not settings.tavily_api_key:
        return None
    try:
        client = _get_client()
        result = client.search(
            question,
            search_depth=settings.search_depth,
            max_results=_MAX_EXTERNAL_SOURCES,
        )
        items = result.get("results", [])[:_MAX_EXTERNAL_SOURCES]
        if not items:
            return None
        return External_ressources(sources=[
            ExternalSource(
                title=item.get("title") or item.get("url", "Untitled"),
                url=item.get("url", ""),
                snippet=(item.get("content") or "")[:300] or None,
            )
            for item in items
        ])
    except Exception:
        return None
