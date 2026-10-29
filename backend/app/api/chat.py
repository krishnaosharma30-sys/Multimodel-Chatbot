"""
Chat and Conversation Management API Router
Handles multimodal chat, RAG retrieval, web search synthesis,
emotional support, conversation memory, audio transcription, and TTS.
"""

import json
import logging
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.connection import get_db
from app.models.models import Conversation, Message, Document, WebSearch
from app.schemas.chat import (
    MessageCreate,
    MessageResponse,
    ChatResponse,
    ConversationResponse,
    ConversationListResponse
)
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.services.search_service import search_service
from app.services.emotion_service import emotion_service
from app.services.audio_service import audio_service
from app.services.image_generation_service import image_generation_service
from app.config import settings

logger = logging.getLogger("uvicorn.error")

router = APIRouter(tags=["Chat & Conversations"])


@router.post("/chat", response_model=ChatResponse)
def handle_chat_message(req: MessageCreate, db: Session = Depends(get_db)):
    """
    Main chat endpoint handling text, images, RAG, web search, emotional assistance, and memory.
    """
    if not req.content or not req.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    user_text = req.content.strip()

    # 1. Conversation Management (Memory)
    if req.conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
        if not conversation:
            # Create if ID passed but does not exist
            title = user_text[:40] + ("..." if len(user_text) > 40 else "")
            conversation = Conversation(id=req.conversation_id, title=title)
            db.add(conversation)
            db.commit()
    else:
        title = user_text[:40] + ("..." if len(user_text) > 40 else "")
        conversation = Conversation(title=title)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    conv_id = conversation.id

    # 2. Image Generation Request Handling (e.g. "make a image of rat", "draw a cat")
    is_img_req, img_subject = image_generation_service.is_image_request(user_text)
    if is_img_req and img_subject:
        img_result = image_generation_service.generate_image(img_subject)
        if img_result:
            asst_text = f"🎨 Here is the image you requested for **'{img_subject}'**:"
            user_msg = Message(
                conversation_id=conv_id,
                role="user",
                content=user_text,
                input_type="text",
                output_type="text"
            )
            db.add(user_msg)

            asst_meta = {
                "generated_image_url": img_result["file_url"],
                "image_filename": img_result["filename"],
                "prompt": img_subject
            }
            asst_msg = Message(
                conversation_id=conv_id,
                role="assistant",
                content=asst_text,
                input_type="text",
                output_type="image",
                metadata_json=json.dumps(asst_meta)
            )
            db.add(asst_msg)
            conversation.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(user_msg)
            db.refresh(asst_msg)

            return ChatResponse(
                conversation_id=conv_id,
                user_message=MessageResponse.model_validate(user_msg),
                assistant_message=MessageResponse.model_validate(asst_msg),
                sources=[]
            )

    # 3. Emotional Assistance & Safety Check (Crisis Intervention)
    is_crisis, crisis_safety_msg = emotion_service.check_crisis(user_text)
    if is_crisis:
        # Create user message
        user_msg = Message(
            conversation_id=conv_id,
            role="user",
            content=user_text,
            input_type=req.input_type or "text",
            output_type="text"
        )
        db.add(user_msg)

        # Create safety assistant message
        asst_msg = Message(
            conversation_id=conv_id,
            role="assistant",
            content=crisis_safety_msg,
            input_type="text",
            output_type="text",
            metadata_json=json.dumps({"type": "crisis_intervention"})
        )
        db.add(asst_msg)
        db.commit()
        db.refresh(user_msg)
        db.refresh(asst_msg)

        return ChatResponse(
            conversation_id=conv_id,
            user_message=MessageResponse.model_validate(user_msg),
            assistant_message=MessageResponse.model_validate(asst_msg),
            sources=[]
        )

    # 3. Emotional Distress Assessment
    is_emotional = emotion_service.is_emotional_query(user_text)
    empathy_prompt = None
    if is_emotional:
        empathy_prompt = emotion_service.get_empathy_system_prompt()

    # 4. Web Search Pipeline
    search_context = None
    search_sources = []
    should_search = req.enable_web_search
    if should_search is None:
        if is_emotional:
            should_search = False
        else:
            should_search = search_service.should_search_web(user_text)

    if should_search:
        logger.info(f"Triggering web search for query: '{user_text}'")
        search_results = search_service.search(query=user_text, max_results=4)
        if search_results:
            lines = ["--- BEGIN WEB SEARCH RESULTS ---"]
            for idx, item in enumerate(search_results):
                lines.append(f"[{idx+1}] {item['title']}\nSnippet: {item['snippet']}\nURL: {item['url']}\n")
                search_sources.append({
                    "type": "web",
                    "title": item["title"],
                    "url": item["url"],
                    "snippet": item["snippet"][:150]
                })
            lines.append("--- END WEB SEARCH RESULTS ---")
            search_context = "\n".join(lines)

            # Store search record
            web_rec = WebSearch(
                conversation_id=conv_id,
                query=user_text,
                results=json.dumps(search_results)
            )
            db.add(web_rec)

    # 5. RAG Pipeline (Document Context Retrieval)
    rag_context = None
    doc_sources = []
    if req.enable_rag:
        retrieved_chunks = rag_service.search_relevant_chunks(
            db=db,
            query=user_text,
            conversation_id=conv_id,
            document_ids=req.document_ids,
            top_k=4
        )
        if retrieved_chunks:
            rag_context = rag_service.build_rag_context(retrieved_chunks)
            for ch in retrieved_chunks:
                doc_sources.append({
                    "type": "document",
                    "filename": ch["filename"],
                    "section": ch["chunk_index"] + 1,
                    "score": ch["score"],
                    "snippet": ch["chunk_text"][:150]
                })

    # 6. Load Conversation History (Memory)
    past_messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
        .limit(10)
        .all()
    )
    chat_history = [{"role": m.role, "content": m.content} for m in past_messages]

    # 7. Generate Response via Multimodal LLM Service
    image_file_path = None
    if req.image_path:
        # Check if relative filename or absolute path
        p = Path(req.image_path)
        if p.exists():
            image_file_path = str(p)
        else:
            up_p = settings.upload_path / req.image_path
            if up_p.exists():
                image_file_path = str(up_p)

    assistant_reply = llm_service.generate_chat_response(
        prompt=user_text,
        chat_history=chat_history,
        image_path=image_file_path,
        rag_context=rag_context,
        search_context=search_context,
        empathy_instruction=empathy_prompt
    )

    # 8. Optional Text-to-Speech (TTS)
    audio_url = None
    if req.enable_tts:
        audio_file = audio_service.text_to_speech(assistant_reply)
        if audio_file:
            audio_url = f"/api/documents/download/{audio_file.name}"

    # 9. Persist Messages in Database
    combined_sources = doc_sources + search_sources

    user_meta = {}
    if req.image_path:
        user_meta["image_path"] = req.image_path

    asst_meta = {}
    if combined_sources:
        asst_meta["sources"] = combined_sources
    if audio_url:
        asst_meta["audio_url"] = audio_url

    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=user_text,
        input_type=req.input_type or ("image" if req.image_path else "text"),
        output_type="text",
        metadata_json=json.dumps(user_meta) if user_meta else None
    )
    db.add(user_msg)

    asst_msg = Message(
        conversation_id=conv_id,
        role="assistant",
        content=assistant_reply,
        input_type="text",
        output_type="audio" if audio_url else "text",
        metadata_json=json.dumps(asst_meta) if asst_meta else None
    )
    db.add(asst_msg)

    # Update conversation timestamp
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user_msg)
    db.refresh(asst_msg)

    return ChatResponse(
        conversation_id=conv_id,
        user_message=MessageResponse.model_validate(user_msg),
        assistant_message=MessageResponse.model_validate(asst_msg),
        sources=combined_sources,
        audio_url=audio_url
    )


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations(db: Session = Depends(get_db)):
    """Lists all chat conversations ordered by most recent activity."""
    convs = (
        db.query(Conversation)
        .order_by(desc(Conversation.updated_at))
        .limit(50)
        .all()
    )
    result = []
    for c in convs:
        result.append(ConversationResponse(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))
    return ConversationListResponse(conversations=result)


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Retrieves full conversation details including messages and uploaded documents."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    documents = (
        db.query(Document)
        .filter(Document.conversation_id == conversation_id)
        .order_by(desc(Document.created_at))
        .all()
    )

    doc_data = [
        {
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "created_at": d.created_at.isoformat()
        }
        for d in documents
    ]

    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[MessageResponse.model_validate(m) for m in messages],
        documents=doc_data
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Deletes a conversation and its messages."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(conv)
    db.commit()
    return {"status": "success", "message": f"Conversation '{conversation_id}' deleted."}


@router.post("/audio/transcribe")
async def transcribe_audio_api(file: UploadFile = File(...)):
    """Transcribes an uploaded voice audio clip into text."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file uploaded")

    suffix = Path(file.filename).suffix.lower()
    temp_filename = f"voice_{uuid.uuid4().hex[:8]}{suffix}"
    temp_path = settings.upload_path / temp_filename

    contents = await file.read()
    with open(temp_path, "wb") as f:
        f.write(contents)

    transcribed_text = audio_service.transcribe_audio(temp_path)
    return {
        "status": "success",
        "filename": file.filename,
        "text": transcribed_text
    }


@router.post("/audio/speak")
def generate_speech_api(text: str):
    """Generates an MP3 audio file for a given text snippet."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    audio_path = audio_service.text_to_speech(text)
    if not audio_path:
        raise HTTPException(status_code=500, detail="Failed to synthesize speech")

    return {
        "status": "success",
        "audio_url": f"/api/documents/download/{audio_path.name}"
    }
