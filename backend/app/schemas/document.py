"""
Pydantic Schemas for Document Ingestion, Creation, and Editing.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    id: str
    conversation_id: Optional[str] = None
    filename: str
    file_type: str
    file_path: str
    chunk_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentCreateRequest(BaseModel):
    conversation_id: Optional[str] = None
    title: str = Field(..., min_length=1, description="Document title or topic")
    instructions: str = Field(..., min_length=1, description="Content instructions or outline")
    format: str = Field("docx", description="docx, pdf, txt, or md")


class DocumentEditRequest(BaseModel):
    document_id: str = Field(..., description="ID of original document to modify")
    conversation_id: Optional[str] = None
    instructions: str = Field(..., min_length=1, description="Edit instructions, e.g. rewrite section, correct grammar, add skill")
    format: Optional[str] = Field(None, description="Optional target format (docx, pdf, txt, md)")


class DocumentGenerationResponse(BaseModel):
    success: bool
    filename: str
    file_url: str
    format: str
    message: str
    summary_of_changes: Optional[str] = None
