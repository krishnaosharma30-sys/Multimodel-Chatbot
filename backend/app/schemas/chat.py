"""
Pydantic Schemas for Chat and Conversations.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    conversation_id: Optional[str] = None
    content: str = Field(..., min_length=1, description="User's prompt or question")
    input_type: Optional[str] = Field("text", description="text, image, document, audio, mixed")
    image_path: Optional[str] = Field(None, description="Path or filename of uploaded image to inspect")
    document_ids: Optional[List[str]] = Field(None, description="Optional document IDs for targeted RAG")
    enable_web_search: Optional[bool] = Field(None, description="None = auto-detect, True/False = explicit toggle")
    enable_rag: Optional[bool] = Field(True, description="Whether to query RAG indexed docs")
    enable_tts: Optional[bool] = Field(False, description="Generate audio speech response")


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    input_type: str
    output_type: str
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    conversation_id: str
    user_message: MessageResponse
    assistant_message: MessageResponse
    sources: Optional[List[Dict[str, Any]]] = None
    generated_document: Optional[Dict[str, Any]] = None
    audio_url: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[MessageResponse]] = None
    documents: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
