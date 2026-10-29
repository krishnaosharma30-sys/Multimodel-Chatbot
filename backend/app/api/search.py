"""
Web Search API Router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from app.database.connection import get_db
from app.models.models import WebSearch
from app.schemas.search import SearchRequest, SearchResponse, SearchResult
from app.services.search_service import search_service

router = APIRouter(prefix="/search", tags=["Web Search"])


@router.post("", response_model=SearchResponse)
def perform_search(request: SearchRequest, db: Session = Depends(get_db)):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    results_data = search_service.search(query=request.query, max_results=request.max_results or 5)

    # Record search in database if conversation_id provided
    if request.conversation_id:
        record = WebSearch(
            conversation_id=request.conversation_id,
            query=request.query,
            results=json.dumps(results_data)
        )
        db.add(record)
        db.commit()

    return SearchResponse(
        query=request.query,
        results=[SearchResult(**item) for item in results_data],
        searched_at=datetime.now(timezone.utc).isoformat()
    )
