"""
Pydantic Schemas for Web Search.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Web search query")
    max_results: Optional[int] = Field(5, ge=1, le=10, description="Max search results to retrieve")
    conversation_id: Optional[str] = None


class SearchResult(BaseModel):
    title: str
    snippet: str
    url: str


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    searched_at: Optional[str] = None
