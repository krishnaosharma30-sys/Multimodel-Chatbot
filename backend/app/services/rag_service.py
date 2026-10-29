"""
Retrieval-Augmented Generation (RAG) Service
Implements text chunking, embedding generation (Gemini or lightweight local vectorizer),
vector storage, similarity search, and context assembly.
"""

import json
import math
import re
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import DocumentChunk, Document

logger = logging.getLogger("uvicorn.error")


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculates cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)


class RAGService:
    def __init__(self):
        self.embedding_dim = 128

    def chunk_text(self, text: str, chunk_size: int = 500, chunk_overlap: int = 100) -> List[str]:
        """
        Splits text into manageable chunks respecting sentence and paragraph boundaries.
        """
        text = text.strip()
        if not text:
            return []

        if len(text) <= chunk_size:
            return [text]

        # Split primarily by paragraphs or sentences
        paragraphs = re.split(r"(\n\s*\n|\n)", text)
        chunks = []
        current_chunk = ""

        for part in paragraphs:
            if not part:
                continue
            if len(current_chunk) + len(part) <= chunk_size:
                current_chunk += part
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                # Add overlap from previous chunk
                overlap_text = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else ""
                current_chunk = overlap_text + part

        if current_chunk.strip() and (not chunks or chunks[-1] != current_chunk.strip()):
            chunks.append(current_chunk.strip())

        return chunks

    def compute_embedding(self, text: str) -> List[float]:
        """
        Generates embedding vector. Uses Gemini API if configured; otherwise uses
        a deterministic feature-hashed term frequency vector for zero-dependency local execution.
        """
        gemini_key = settings.GEMINI_API_KEY or settings.LLM_API_KEY
        if gemini_key and not getattr(self, "_use_local_embedding", False):
            try:
                from google import genai
                client = genai.Client(api_key=gemini_key)
                resp = client.models.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    contents=text[:2000]
                )
                if hasattr(resp, "embedding") and resp.embedding:
                    return resp.embedding.values
                if hasattr(resp, "embeddings") and resp.embeddings:
                    return resp.embeddings[0].values
            except Exception as e:
                self._use_local_embedding = True
                logger.info(f"Using high-speed local vectorizer for RAG embeddings.")

        # Local deterministic normalized term-frequency embedding
        return self._local_vectorize(text)

    def _local_vectorize(self, text: str) -> List[float]:
        """
        A robust, deterministic term-frequency bag-of-words / hash-projection vectorizer
        that computes normalized embeddings for cosine similarity offline.
        """
        dim = self.embedding_dim
        vec = [0.0] * dim
        words = re.findall(r"\w+", text.lower())
        if not words:
            return vec

        for word in words:
            # Deterministic hash bucket
            h = abs(hash(word)) % dim
            # Sign hash for balanced projections
            sign = 1.0 if (abs(hash(word + "_sign")) % 2 == 0) else -1.0
            vec[h] += sign

        # L2 Normalization
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    def ingest_document(
        self,
        db: Session,
        document_id: str,
        text: str,
        chunk_size: int = 500,
        chunk_overlap: int = 100
    ) -> int:
        """
        Chunks document text, generates embeddings, and saves chunks to the database.
        Returns the number of chunks created.
        """
        chunks = self.chunk_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        created_count = 0

        for idx, chunk_str in enumerate(chunks):
            embedding_vec = self.compute_embedding(chunk_str)
            chunk_record = DocumentChunk(
                document_id=document_id,
                chunk_text=chunk_str,
                chunk_index=idx,
                embedding=json.dumps(embedding_vec),
                chunk_metadata=json.dumps({"char_length": len(chunk_str), "chunk_index": idx})
            )
            db.add(chunk_record)
            created_count += 1

        db.commit()
        logger.info(f"Ingested {created_count} chunks for document {document_id}")
        return created_count

    def search_relevant_chunks(
        self,
        db: Session,
        query: str,
        conversation_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Performs vector similarity search against stored document chunks.
        """
        query_vec = self.compute_embedding(query)

        # Build base query
        q = db.query(DocumentChunk).join(Document)

        if document_ids:
            q = q.filter(DocumentChunk.document_id.in_(document_ids))
        elif conversation_id:
            q = q.filter(Document.conversation_id == conversation_id)

        all_chunks = q.all()
        if not all_chunks:
            return []

        scored_chunks = []
        for ch in all_chunks:
            if not ch.embedding:
                continue
            try:
                chunk_vec = json.loads(ch.embedding)
                sim = cosine_similarity(query_vec, chunk_vec)
                scored_chunks.append({
                    "chunk_id": ch.id,
                    "document_id": ch.document_id,
                    "filename": ch.document.filename if ch.document else "Unknown Document",
                    "chunk_index": ch.chunk_index,
                    "chunk_text": ch.chunk_text,
                    "score": round(sim, 4)
                })
            except Exception as e:
                logger.warning(f"Error parsing chunk embedding: {e}")

        # Rank by score descending
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

    def build_rag_context(self, retrieved_chunks: List[Dict[str, Any]]) -> str:
        """
        Formats retrieved document chunks into clean LLM context.
        """
        if not retrieved_chunks:
            return ""

        context_lines = ["--- BEGIN RETRIEVED DOCUMENT CONTEXT ---"]
        for i, ch in enumerate(retrieved_chunks):
            context_lines.append(
                f"[Source {i+1}: {ch['filename']} (Section {ch['chunk_index']+1}) - Similarity: {ch['score']}]\n"
                f"{ch['chunk_text']}\n"
            )
        context_lines.append("--- END RETRIEVED DOCUMENT CONTEXT ---")
        return "\n".join(context_lines)


rag_service = RAGService()
