"""
Health Check API
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.connection import get_db, engine
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    # Check DB status
    db_status = "connected"
    db_type = "postgresql" if "postgresql" in str(engine.url) else "sqlite"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unreachable: {str(e)}"

    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": {
            "status": db_status,
            "type": db_type,
        },
        "llm_provider": {
            "model": settings.LLM_MODEL,
            "configured": bool(settings.GEMINI_API_KEY or settings.LLM_API_KEY),
            "mode": "live_gemini" if (settings.GEMINI_API_KEY or settings.LLM_API_KEY) else "local_intelligent_fallback"
        },
        "search_provider": {
            "duckduckgo": "enabled",
            "tavily": "enabled" if settings.TAVILY_API_KEY else "disabled"
        }
    }
