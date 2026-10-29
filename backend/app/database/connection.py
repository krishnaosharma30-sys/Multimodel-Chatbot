"""
Database Connection and Session Management
Configured for PostgreSQL with automatic graceful local SQLite fallback.
"""

import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings, BASE_DIR
from app.models.models import Base

logger = logging.getLogger("uvicorn.error")

_engine = None
_SessionLocal = None


def create_db_engine():
    global _engine, _SessionLocal
    db_url = settings.DATABASE_URL

    if db_url.startswith("postgresql"):
        try:
            # Test PostgreSQL connection with a short connect_timeout
            test_engine = create_engine(
                db_url,
                connect_args={"connect_timeout": 3},
                pool_pre_ping=True
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ Successfully connected to PostgreSQL database.")
            _engine = test_engine
        except Exception as e:
            if settings.SQLITE_FALLBACK:
                sqlite_path = BASE_DIR / "multimodal_chatbot.db"
                sqlite_url = f"sqlite:///{sqlite_path}"
                logger.warning(
                    f"⚠️ Could not connect to PostgreSQL ({e}). "
                    f"Falling back to local SQLite at {sqlite_url} for zero-friction MVP usage."
                )
                _engine = create_engine(
                    sqlite_url,
                    connect_args={"check_same_thread": False}
                )
            else:
                logger.error(f"❌ Failed to connect to PostgreSQL: {e}")
                raise e
    else:
        # Direct SQLite or other URI
        _engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
        )

    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


# Initialize engine
engine = create_db_engine()
SessionLocal = _SessionLocal


def get_db():
    """
    FastAPI dependency that yields a SQLAlchemy database session and ensures it closes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Creates all application tables if they do not exist.
    """
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")
