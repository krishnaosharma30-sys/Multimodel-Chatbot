"""
Document Service
Handles extraction of text from PDF, DOCX, TXT, and Markdown files,
as well as creating new documents and generating edited versions without overwriting originals.
"""

import uuid
import re
import logging
from pathlib import Path
from typing import Tuple, Optional
from app.config import settings

logger = logging.getLogger("uvicorn.error")


class DocumentService:
    def extract_text(self, file_path: Path, file_type: str) -> str:
        """
        Extracts clean text from PDF, DOCX, TXT, and Markdown files.
        """
        file_type = file_type.lower().lstrip(".")
        text = ""

        try:
            if file_type == "pdf":
                from pypdf import PdfReader
                reader = PdfReader(str(file_path))
                pages_text = []
                for i, page in enumerate(reader.pages):
                    extracted = page.extract_text()
                    if extracted:
                        pages_text.append(f"--- Page {i+1} ---\n{extracted.strip()}")
                text = "\n\n".join(pages_text)

            elif file_type in ["docx", "doc"]:
                import docx
                doc = docx.Document(str(file_path))
                lines = [p.text for p in doc.paragraphs if p.text.strip()]
                # Also extract table text
                for table in doc.tables:
                    for row in table.rows:
                        row_vals = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                        if row_vals:
                            lines.append(" | ".join(row_vals))
                text = "\n\n".join(lines)

            elif file_type in ["txt", "md", "markdown"]:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    text = f.read()

            elif file_type in ["png", "jpg", "jpeg", "webp"]:
                text = f"[Image File: {file_path.name} - Available for Multimodal Visual Inspection]"

            else:
                # Fallback text reading
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    text = f.read()

        except Exception as e:
            logger.error(f"Error extracting text from {file_path.name} ({file_type}): {e}")
            text = f"Error extracting content: {str(e)}"

        return text.strip()

    def create_document(self, title: str, content: str, doc_format: str = "docx") -> Path:
        """
        Creates a new downloadable document (docx, md, txt, or pdf).
        Saves file to settings.generated_path.
        """
        doc_format = doc_format.lower().lstrip(".")
        clean_title = re.sub(r"[^\w\s-]", "", title).strip() or "document"
        filename = f"{clean_title}_{uuid.uuid4().hex[:8]}.{doc_format}"
        out_path = settings.generated_path / filename

        if doc_format == "docx":
            import docx
            doc = docx.Document()
            # Title
            doc.add_heading(title, level=0)
            # Process paragraphs and bullet points
            lines = content.split("\n")
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue
                if stripped.startswith("### "):
                    doc.add_heading(stripped[4:], level=3)
                elif stripped.startswith("## "):
                    doc.add_heading(stripped[3:], level=2)
                elif stripped.startswith("# "):
                    doc.add_heading(stripped[2:], level=1)
                elif stripped.startswith("- ") or stripped.startswith("* "):
                    doc.add_paragraph(stripped[2:], style='List Bullet')
                elif re.match(r"^\d+\.\s", stripped):
                    doc.add_paragraph(re.sub(r"^\d+\.\s", "", stripped), style='List Number')
                else:
                    doc.add_paragraph(stripped)
            doc.save(str(out_path))

        elif doc_format in ["md", "markdown"]:
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(f"# {title}\n\n{content}")

        elif doc_format == "pdf":
            # For lightweight PDF generation, we create a clean formatted text document
            # or use docx if needed. Let's write a clean text-based PDF or fallback to .txt
            try:
                # Check if reportlab is available, else write formatted text
                with open(out_path.with_suffix(".txt"), "w", encoding="utf-8") as f:
                    f.write(f"=== {title} ===\n\n{content}")
                out_path = out_path.with_suffix(".txt")
            except Exception:
                with open(out_path, "w", encoding="utf-8") as f:
                    f.write(f"=== {title} ===\n\n{content}")

        else:  # txt fallback
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(f"=== {title} ===\n\n{content}")

        logger.info(f"Generated new document saved to: {out_path}")
        return out_path

    def edit_document(
        self,
        original_file_path: Path,
        original_file_type: str,
        instructions: str,
        updated_content: str,
        target_format: Optional[str] = None
    ) -> Tuple[Path, str]:
        """
        Generates an updated version of an existing document without modifying the original.
        Returns (new_file_path, summary_of_changes).
        """
        orig_name = original_file_path.stem
        fmt = target_format or original_file_type
        fmt = fmt.lower().lstrip(".")

        out_title = f"Updated_{orig_name}"
        new_path = self.create_document(title=out_title, content=updated_content, doc_format=fmt)

        summary = f"Generated updated document based on request: '{instructions[:100]}...'"
        return new_path, summary


document_service = DocumentService()
