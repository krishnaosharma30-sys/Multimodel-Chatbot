"""
Main FastAPI Application Entrypoint
Multimodal AI Chatbot MVP Backend
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database.connection import init_db
from app.api import health, chat, documents, search

# Setup logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database schema and directories
    logger.info("Starting up Multimodal AI Chatbot MVP Backend...")
    try:
        init_db()
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")

    # Ensure upload directories exist
    settings.upload_path
    settings.generated_path
    logger.info(f"Upload directory ready at: {settings.upload_path}")

    yield

    # Shutdown
    logger.info("Shutting down Multimodal AI Chatbot MVP Backend...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "A beginner-friendly Multimodal AI Chatbot MVP integrating text, images, "
        "PDF/DOCX documents, RAG, Web Search, Audio/TTS, Document Editing, "
        "and Personal Emotional Assistance."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
origins = settings.cors_origin_list
if not origins or "*" in origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "An unexpected error occurred while processing your request. Please try again.",
            "detail": str(exc) if settings.DEBUG else None
        }
    )

# Include Routers with /api prefix
app.include_router(health.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(search.router, prefix="/api")


@app.get("/", tags=["Root"])
def root_status():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "api_docs": "/docs",
        "health_check": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
