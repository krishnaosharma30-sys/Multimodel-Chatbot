"""
Application Configuration Module
Reads configuration from environment variables or .env file with sensible defaults.
"""

import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "Multimodal AI Chatbot MVP"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server Bindings
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Database Settings
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/multimodal_chatbot"
    SQLITE_FALLBACK: bool = True

    # AI / LLM Configuration
    GEMINI_API_KEY: str = ""
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-flash-latest"
    EMBEDDING_MODEL: str = "text-embedding-004"

    # Search Configuration
    TAVILY_API_KEY: str = ""
    SEARCH_API_KEY: str = ""

    # Uploads & File Management
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 25

    @property
    def upload_path(self) -> Path:
        path = BASE_DIR / self.UPLOAD_DIR
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def generated_path(self) -> Path:
        path = self.upload_path / "generated"
        path.mkdir(parents=True, exist_ok=True)
        return path

    # Allowed extensions
    ALLOWED_EXTENSIONS: set = {
        # Documents
        ".pdf", ".docx", ".txt", ".md",
        # Images
        ".png", ".jpg", ".jpeg", ".webp",
        # Audio
        ".wav", ".mp3", ".m4a", ".ogg", ".webm"
    }

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
