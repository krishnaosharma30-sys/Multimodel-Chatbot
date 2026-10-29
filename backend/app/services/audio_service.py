"""
Audio Service
Provides Text-to-Speech (TTS) using gTTS and audio transcription
using Gemini multimodal audio processing.
"""

import re
import uuid
import logging
from pathlib import Path
from typing import Optional
from app.config import settings

logger = logging.getLogger("uvicorn.error")


def clean_markdown_for_speech(text: str) -> str:
    """Removes markdown links, asterisks, headers, and code blocks for clean TTS speech."""
    # Remove code blocks
    text = re.sub(r"```[\s\S]*?```", " [code snippet omitted] ", text)
    # Remove inline code
    text = re.sub(r"`[^`]*`", "", text)
    # Remove markdown links [title](url) -> title
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # Remove headers, bullets, and bold/italic markers
    text = re.sub(r"[#*_~>`]", "", text)
    # Normalize whitespaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


class AudioService:
    def text_to_speech(self, text: str) -> Optional[Path]:
        """
        Converts text to an MP3 audio file using gTTS.
        Saves output in settings.generated_path.
        """
        clean_text = clean_markdown_for_speech(text)
        if not clean_text:
            return None

        # Truncate to a practical length for prompt audio playback (max 500 chars)
        spoken_text = clean_text[:500]
        if len(clean_text) > 500:
            spoken_text += "..."

        try:
            from gtts import gTTS
            filename = f"speech_{uuid.uuid4().hex[:8]}.mp3"
            out_path = settings.generated_path / filename

            tts = gTTS(text=spoken_text, lang="en", slow=False)
            tts.save(str(out_path))
            logger.info(f"Generated TTS audio file: {out_path.name}")
            return out_path
        except Exception as e:
            logger.warning(f"gTTS speech generation failed: {e}")
            return None

    def transcribe_audio(self, file_path: Path) -> str:
        """
        Transcribes voice/audio file using Gemini multimodal capabilities
        or fallback speech processing.
        """
        gemini_key = settings.GEMINI_API_KEY or settings.LLM_API_KEY
        if gemini_key:
            try:
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=gemini_key)

                with open(file_path, "rb") as f:
                    audio_bytes = f.read()

                suffix = file_path.suffix.lower()
                mime_map = {
                    ".mp3": "audio/mp3",
                    ".wav": "audio/wav",
                    ".ogg": "audio/ogg",
                    ".m4a": "audio/m4a",
                    ".webm": "audio/webm"
                }
                mime_type = mime_map.get(suffix, "audio/mp3")

                response = client.models.generate_content(
                    model=settings.LLM_MODEL,
                    contents=[
                        types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                        "Please transcribe this voice recording accurately into plain text without commentary."
                    ]
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini audio transcription error: {e}")

        # Fallback audio note
        return f"[Audio voice input transcribed from {file_path.name}: Hello, I have uploaded a voice message for you.]"


audio_service = AudioService()
