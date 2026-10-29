"""
SQLAlchemy ORM Models for Multimodal AI Chatbot.
Compatible with PostgreSQL (and automatic fallback for seamless local MVP runs).
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def get_utc_now():
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False, default="New Conversation")
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    documents = relationship("Document", back_populates="conversation", cascade="all, delete-orphan")
    web_searches = relationship("WebSearch", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # "user", "assistant", "system"
    content = Column(Text, nullable=False)
    input_type = Column(String(50), default="text")  # "text", "image", "document", "audio", "mixed"
    output_type = Column(String(50), default="text")  # "text", "document", "audio", "mixed"
    metadata_json = Column(Text, nullable=True)  # JSON string for citations, audio url, doc links, etc.
    created_at = Column(DateTime, default=get_utc_now, nullable=False, index=True)

    conversation = relationship("Conversation", back_populates="messages")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # "pdf", "docx", "txt", "image", etc.
    file_path = Column(String(500), nullable=False)
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    conversation = relationship("Conversation", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False, default=0)
    # Stored as serialized JSON list of floats for wide database portability (and pgvector compatible)
    embedding = Column(Text, nullable=True)
    chunk_metadata = Column(Text, nullable=True)

    document = relationship("Document", back_populates="chunks")


class WebSearch(Base):
    __tablename__ = "web_searches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    query = Column(String(500), nullable=False)
    results = Column(Text, nullable=False)  # JSON array of {title, snippet, url}
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    conversation = relationship("Conversation", back_populates="web_searches")
