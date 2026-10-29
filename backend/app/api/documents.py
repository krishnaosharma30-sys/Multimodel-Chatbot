"""
Documents API Router
Handles file uploads, text extraction, RAG chunk ingestion,
document creation, document editing, and file downloads.
"""

import os
import re
import uuid
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.models.models import Document, Conversation
from app.schemas.document import (
    DocumentResponse,
    DocumentCreateRequest,
    DocumentEditRequest,
    DocumentGenerationResponse
)
from app.services.document_service import document_service
from app.services.rag_service import rag_service
from app.services.llm_service import llm_service

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="", tags=["Documents"])


def sanitize_filename(filename: str) -> str:
    """Removes potentially dangerous path traversal characters."""
    clean = re.sub(r"[^\w\.-]", "_", Path(filename).name)
    return clean or f"file_{uuid.uuid4().hex[:6]}"


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Uploads a file (PDF, DOCX, TXT, Image, Audio), extracts content,
    and runs the RAG pipeline for text documents.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Extension validation
    clean_name = sanitize_filename(file.filename)
    file_ext = Path(clean_name).suffix.lower()

    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(sorted(settings.ALLOWED_EXTENSIONS))}"
        )

    # Read content and validate size
    contents = await file.read()
    file_size_mb = len(contents) / (1024 * 1024)
    if file_size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB (File size: {file_size_mb:.1f}MB)"
        )

    # Save to upload directory with unique prefix
    unique_filename = f"{uuid.uuid4().hex[:8]}_{clean_name}"
    save_path = settings.upload_path / unique_filename
    with open(save_path, "wb") as f:
        f.write(contents)

    # Ensure conversation exists if provided
    if conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conv:
            conv = Conversation(id=conversation_id, title=f"Chat ({clean_name})")
            db.add(conv)
            db.commit()

    # Determine file classification
    if file_ext in [".pdf", ".docx", ".doc", ".txt", ".md"]:
        file_type = "document"
    elif file_ext in [".png", ".jpg", ".jpeg", ".webp"]:
        file_type = "image"
    elif file_ext in [".mp3", ".wav", ".m4a", ".ogg", ".webm"]:
        file_type = "audio"
    else:
        file_type = "other"

    # Extract text content
    extracted_text = document_service.extract_text(save_path, file_ext)

    # Save Document record
    doc = Document(
        conversation_id=conversation_id,
        filename=clean_name,
        file_type=file_ext.lstrip("."),
        file_path=str(save_path),
        extracted_text=extracted_text[:100000] if extracted_text else ""
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # If document type, run RAG ingestion pipeline (chunking + embedding)
    chunk_count = 0
    if file_type == "document" and extracted_text:
        chunk_count = rag_service.ingest_document(
            db=db,
            document_id=doc.id,
            text=extracted_text
        )

    return {
        "status": "success",
        "document_id": doc.id,
        "filename": doc.filename,
        "file_type": file_type,
        "file_extension": file_ext,
        "file_path": str(save_path),
        "chunk_count": chunk_count,
        "extracted_snippet": extracted_text[:300] if extracted_text else "",
        "download_url": f"/api/documents/download/{unique_filename}"
    }


@router.post("/documents/create", response_model=DocumentGenerationResponse)
def create_document_api(req: DocumentCreateRequest, db: Session = Depends(get_db)):
    """
    Generates a new structured document from user instructions.
    """
    # 1. Generate text using LLM
    content = llm_service.edit_or_generate_document_content(instructions=req.instructions)

    # 2. Save document to requested format
    out_path = document_service.create_document(
        title=req.title,
        content=content,
        doc_format=req.format or "docx"
    )

    filename = out_path.name
    return DocumentGenerationResponse(
        success=True,
        filename=filename,
        file_url=f"/api/documents/download/{filename}",
        format=req.format,
        message=f"Successfully generated new document: {filename}",
        summary_of_changes=f"Created {req.format.upper()} document with {len(content.splitlines())} lines."
    )


@router.post("/documents/edit", response_model=DocumentGenerationResponse)
def edit_document_api(req: DocumentEditRequest, db: Session = Depends(get_db)):
    """
    Modifies an existing uploaded document according to instructions.
    The original file is NOT overwritten; a new downloadable file is generated.
    """
    doc = db.query(Document).filter(Document.id == req.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Original document not found")

    orig_path = Path(doc.file_path)
    if not orig_path.exists():
        raise HTTPException(status_code=404, detail="Original file missing on disk")

    # 1. Read existing content
    orig_text = doc.extracted_text or document_service.extract_text(orig_path, doc.file_type)

    # 2. Ask LLM to apply edits
    updated_text = llm_service.edit_or_generate_document_content(
        instructions=req.instructions,
        original_content=orig_text
    )

    # 3. Create updated document
    target_fmt = req.format or doc.file_type
    new_path, summary = document_service.edit_document(
        original_file_path=orig_path,
        original_file_type=doc.file_type,
        instructions=req.instructions,
        updated_content=updated_text,
        target_format=target_fmt
    )

    filename = new_path.name
    return DocumentGenerationResponse(
        success=True,
        filename=filename,
        file_url=f"/api/documents/download/{filename}",
        format=target_fmt,
        message=f"Successfully generated updated version of {doc.filename}",
        summary_of_changes=summary
    )


def get_media_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    mapping = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain",
        ".md": "text/markdown"
    }
    return mapping.get(ext, "application/octet-stream")


@router.get("/documents/download/{filename}")
def download_document(filename: str):
    """
    Serves generated or uploaded documents for download or inline preview.
    """
    clean_name = sanitize_filename(filename)
    media_type = get_media_type(clean_name)

    # Check generated folder first, then uploads folder
    gen_file = settings.generated_path / clean_name
    if gen_file.exists() and gen_file.is_file():
        return FileResponse(
            path=str(gen_file),
            filename=clean_name,
            media_type=media_type
        )

    up_file = settings.upload_path / clean_name
    if up_file.exists() and up_file.is_file():
        return FileResponse(
            path=str(up_file),
            filename=clean_name,
            media_type=media_type
        )

    raise HTTPException(status_code=404, detail=f"File '{filename}' not found.")
