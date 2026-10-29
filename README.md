# Multimodal AI Chatbot — MVP

> A clean, beginner-friendly, and modular Multimodal AI Chatbot MVP built with **React**, **FastAPI**, **PostgreSQL**, and **Google Gemini Multimodal LLM**.

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Project Description

The **Multimodal AI Chatbot MVP** is an interactive, multi-capability conversational assistant designed to bridge multimodal inputs (text, images, documents, and voice) with versatile outputs (grounded text answers, downloadable document revisions, and synthesized audio).

The application is engineered with beginner-friendly modular service layers:
- **Multimodal Interaction**: Process text queries alongside image diagrams, voice recordings, and files.
- **Retrieval-Augmented Generation (RAG)**: Ingest PDF, DOCX, and TXT files into semantic chunks and retrieve context with vector similarity search.
- **Live Web Search**: Automatically detect when queries require real-time information and synthesize external web results without requiring paid keys.
- **Document Creation & Non-Destructive Editing**: Generate new documents or modify existing files while strictly preserving the original upload.
- **Personal Emotional Assistance & Safety**: Provide empathetic listening, practical grounding routines, and crisis intervention safety safeguards.

---

## 2. Key Features & MVP Scope

| Feature Category | Capabilities Included in MVP |
| :--- | :--- |
| **Multimodal Input** | Text messages, image uploads (PNG, JPG, WebP), document attachments (PDF, DOCX, TXT, MD), and voice recordings (WebM, WAV, MP3). |
| **Multimodal Output** | Formatted Markdown text, AI-generated high-resolution images with inline preview & download, downloadable updated documents (.docx, .txt, .md), and text-to-speech audio (.mp3). |
| **AI Image Generation** | Multi-engine visual synthesis (Pollinations AI + Wikimedia High-Res Photography Archive) with automatic quality prompt enhancement. |
| **RAG Pipeline** | Ingestion pipeline, recursive text chunking, vector embedding generation, cosine similarity search, and context injection into LLM prompts. |
| **Web Search** | Zero-config DuckDuckGo live search with intelligent intent detection (triggers on current facts, news, and temporal keywords), plus optional Tavily support. |
| **Document Tools** | Create new structured Word documents; edit existing uploaded documents non-destructively without overwriting the original. |
| **Emotional Support** | Empathetic listening, active validation, gentle follow-up questions, healthy coping tips, and built-in 988 Crisis Lifeline safety alerts. |
| **Conversation Memory**| Persistent chat sessions and multi-turn context memory backed by PostgreSQL (with automatic SQLite fallback for zero-friction local setup). |
| **Source Citation** | Interactive sources shelf displaying both uploaded document chunk references (with similarity scores) and web source URLs. |

---

## 3. Technology Stack

### Frontend
- **Framework**: React 19 + Vite
- **Icons**: Lucide React
- **Audio Processing**: Web Speech API + HTML5 MediaRecorder (browser-native with backend fallback)
- **Styling**: Modern dark-theme responsive UI with CSS custom properties

### Backend
- **Framework**: FastAPI (Python)
- **ASGI Server**: Uvicorn
- **ORM & Database**: SQLAlchemy 2.0 with Psycopg 3 & pgvector
- **Text & Document Extraction**: `pypdf`, `python-docx`
- **Search Engine**: DuckDuckGo Search (`ddgs` / `duckduckgo-search`)
- **Speech Synthesis (TTS)**: `gTTS` (Google Text-to-Speech)
- **AI / LLM Integration**: Google Gemini (`google-genai` with model `gemini-flash-latest` / `gemini-3.8-flash`) via an abstraction service layer with local fallback

### Database
- **Primary**: PostgreSQL (with pgvector support)
- **Local Fallback**: SQLite (`multimodal_chatbot.db`) automatically activated if PostgreSQL is not running locally

---

## 4. System Architecture

The following diagram illustrates the high-level architecture and data flow between client, backend routers, services, database, and external providers:

```mermaid
flowchart TD
    subgraph Client["React Frontend (Vite)"]
        UI["Chat Interface (Single Page)"]
        InputComp["ChatInput (Text, Image, Docs, Audio)"]
        DocTool["Document Creator & Editor Modal"]
        SourcesView["Source List & Citation Shelf"]
    end

    subgraph Backend["FastAPI Backend (REST API)"]
        RouterChat["/api/chat Router"]
        RouterDocs["/api/documents & /api/upload"]
        RouterSearch["/api/search Router"]
        RouterHealth["/api/health Router"]
        RouterAudio["/api/audio/transcribe & /speak"]

        subgraph ServiceLayer["Service Abstraction Layer"]
            LLMService["LLMService (Gemini 2.5 Flash / Local Engine)"]
            RAGService["RAGService (Chunking & Embeddings)"]
            DocService["DocumentService (PDF/DOCX Extraction & Generation)"]
            SearchService["SearchService (DuckDuckGo / Tavily)"]
            EmotionService["EmotionService (Empathy & Crisis Safety)"]
            AudioService["AudioService (gTTS & Speech Transcribe)"]
        end
    end

    subgraph Storage["Data & File Storage"]
        DB[("PostgreSQL / SQLite")]
        UploadsDir["/uploads & /uploads/generated"]
    end

    subgraph External["External APIs"]
        GeminiAPI["Google Gemini AI API"]
        DDG["DuckDuckGo Search Engine"]
    end

    InputComp -->|HTTP POST| RouterChat
    InputComp -->|File Upload| RouterDocs
    DocTool -->|Create / Edit| RouterDocs

    RouterChat --> LLMService
    RouterChat --> RAGService
    RouterChat --> SearchService
    RouterChat --> EmotionService
    RouterChat --> AudioService

    RouterDocs --> DocService
    RouterDocs --> RAGService

    ServiceLayer --> DB
    ServiceLayer --> UploadsDir
    LLMService -.-> GeminiAPI
    SearchService -.-> DDG

    RouterChat --> SourcesView
    RouterChat --> UI
```

---

## 5. RAG (Retrieval-Augmented Generation) Architecture

The RAG pipeline extracts text, chunks content with overlapping windows, calculates embeddings, indexes vectors, and retrieves relevant snippets to ground the LLM's responses:

```mermaid
flowchart TD
    A["User Uploads Document (.pdf, .docx, .txt, .md)"] --> B["DocumentService: Text Extraction"]
    B --> C["RAGService: Text Chunking (500 chars, 100 overlap)"]
    C --> D["Embedding Generation (Gemini text-embedding-004 / Local Vectorizer)"]
    D --> E[("Database: document_chunks table with Embeddings")]

    F["User Query (e.g. 'Summarize Chapter 2')"] --> G["Compute Query Embedding Vector"]
    G --> H["Vector Similarity Search (Cosine Distance / Top-K)"]
    E --> H
    H --> I["Assemble Grounded Context Block"]
    I --> J["LLM Prompt Injection (System + RAG Context + Question)"]
    J --> K["Multimodal LLM Response Generation"]
    K --> L["Display Response with Document Source Citations & Scores"]
```

---

## 6. Project Structure

```text
MULTIMODEL AI CHATBOT/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI entrypoint, middleware, lifespan
│   │   ├── config.py                  # Pydantic Settings & environment variables
│   │   ├── api/
│   │   │   ├── chat.py                # Chat, conversation memory & audio endpoints
│   │   │   ├── documents.py           # Upload, create, edit, download endpoints
│   │   │   ├── search.py              # Web search endpoint
│   │   │   └── health.py              # Health check & provider status
│   │   ├── services/
│   │   │   ├── llm_service.py         # Gemini multimodal LLM abstraction + local engine
│   │   │   ├── rag_service.py         # Chunking, vector embeddings, similarity search
│   │   │   ├── document_service.py    # PDF/DOCX parsing, generation & editing
│   │   │   ├── search_service.py      # DuckDuckGo search & intent classification
│   │   │   ├── audio_service.py       # gTTS speech synthesis & transcription
│   │   │   └── emotion_service.py     # Empathy tone & crisis intervention safety
│   │   ├── database/
│   │   │   ├── connection.py          # PostgreSQL session engine + SQLite fallback
│   │   │   └── __init__.py
│   │   ├── models/
│   │   │   ├── models.py              # SQLAlchemy Conversation, Message, Document, Chunk
│   │   │   └── __init__.py
│   │   ├── schemas/
│   │   │   ├── chat.py                # Chat Pydantic request/response schemas
│   │   │   ├── document.py            # Document Pydantic schemas
│   │   │   └── search.py              # Search Pydantic schemas
│   ├── tests/
│   │   └── test_all_features.py       # Comprehensive end-to-end test suite
│   ├── uploads/                       # User uploaded files & generated documents
│   │   └── generated/
│   ├── requirements.txt               # Backend Python dependencies
│   ├── .env                           # Local environment config
│   └── .env.example                   # Template environment file
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx         # Main chat display & welcome starter cards
│   │   │   ├── MessageBubble.jsx      # Message rendering, markdown formatting, TTS audio
│   │   │   ├── ChatInput.jsx          # Input textarea, voice button, feature toggles
│   │   │   ├── FileUpload.jsx         # Drag-and-drop / file attachment picker
│   │   │   ├── VoiceInput.jsx         # Speech recognition & audio recorder
│   │   │   ├── DocumentPreview.jsx    # Attached document chip & edit requester
│   │   │   └── SourceList.jsx         # Grounded citations shelf (RAG & Web)
│   │   ├── pages/
│   │   │   └── ChatPage.jsx           # Main chat page layout, sidebar, history & doc modal
│   │   ├── services/
│   │   │   └── api.js                 # Frontend REST API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                  # Dark mode color tokens & responsive layout
│   ├── package.json
│   └── vite.config.js
│
├── .env.example                       # Root environment variable template
├── .gitignore                         # Git exclusion rules
└── README.md                          # Comprehensive documentation
```

---

## 7. Prerequisites

Before running the application locally, ensure you have:
- **Python**: Version `3.10` or higher (`3.11`, `3.12`, or `3.14` supported)
- **Node.js**: Version `18.x` or higher (with `npm`)
- **PostgreSQL** *(Recommended)*: Version 14+ running locally or in Docker. If not running, the application will automatically fall back to SQLite for instant testing.
- **Google Gemini API Key** *(Optional)*: Free API key from [Google AI Studio](https://aistudio.google.com/app/apikey). If omitted, the application runs in local AI mode.

---

## 8. Installation & Setup

### A. Clone the Repository
```bash
git clone <repository_url>
cd "MULTIMODEL AI CHATBOT"
```

### B. PostgreSQL Database Setup
1. Open your PostgreSQL terminal (`psql`):
   ```sql
   CREATE DATABASE multimodal_chatbot;
   ```
2. *(Optional pgvector extension)*:
   ```sql
   \c multimodal_chatbot;
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Set your connection string in `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multimodal_chatbot
   ```
   > **Note**: If you don't have PostgreSQL installed right now, keep `SQLITE_FALLBACK=True` in `.env`. The backend will automatically create and use `multimodal_chatbot.db` without crashing!

### C. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env    # On Windows
   # or: cp .env.example .env # On Linux/macOS
   ```
   Add your `GEMINI_API_KEY` in `backend/.env` (optional).

### D. Frontend Setup
1. In a separate terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install node dependencies:
   ```bash
   npm install
   ```

---

## 9. How to Run the Application

### 1. Start the Backend Server
From the `backend` directory with the virtual environment activated:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs (Swagger UI): `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

### 2. Start the Frontend Application
From the `frontend` directory:
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173
```

### 3. Run Automated End-to-End Tests
To verify all endpoints, database initialization, RAG retrieval, web search, document editing, and TTS:
```bash
cd backend
.\venv\Scripts\python.exe tests/test_all_features.py
```

---

## 10. Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/multimodal_chatbot` | PostgreSQL connection string. |
| `SQLITE_FALLBACK` | `True` | Automatically falls back to local SQLite if PostgreSQL is unreachable. |
| `GEMINI_API_KEY` | `""` | Google Gemini API Key from Google AI Studio. |
| `LLM_MODEL` | `gemini-2.5-flash` | Multimodal model name used for text, images, and audio. |
| `EMBEDDING_MODEL`| `text-embedding-004` | Embedding model for semantic vector representation. |
| `TAVILY_API_KEY` | `""` | Optional API key for Tavily search (DuckDuckGo is default & free). |
| `SEARCH_API_KEY` | `""` | Alternative search provider key placeholder. |
| `UPLOAD_DIR` | `uploads` | Directory where user uploads and generated files are stored. |
| `MAX_FILE_SIZE_MB`| `25` | Maximum allowed upload size in megabytes. |
| `HOST` | `127.0.0.1` | Backend host IP binding. |
| `PORT` | `8000` | Backend port number. |
| `DEBUG` | `True` | Enables debug logging and detailed error responses in development. |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated allowed frontend origins. |

---

## 11. API Endpoints Reference

All endpoints are documented interactively via OpenAPI at `http://127.0.0.1:8000/docs`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status, database connection type, and AI mode. |
| `POST` | `/api/chat` | Main conversational endpoint (handles text, RAG, search, image path, memory). |
| `GET` | `/api/conversations` | List recent conversation sessions. |
| `GET` | `/api/conversations/{id}` | Retrieve full conversation history and attached documents. |
| `DELETE` | `/api/conversations/{id}` | Delete a conversation and its messages. |
| `POST` | `/api/upload` | Upload PDF, DOCX, image, or audio files and trigger RAG indexing. |
| `POST` | `/api/documents/create` | Generate a new Word (.docx), Markdown (.md), or Text (.txt) document. |
| `POST` | `/api/documents/edit` | Non-destructively generate an edited version of an uploaded document. |
| `GET` | `/api/documents/download/{filename}` | Download generated or uploaded files. |
| `POST` | `/api/search` | Standalone web search endpoint. |
| `POST` | `/api/audio/transcribe` | Transcribe an uploaded voice audio file. |
| `POST` | `/api/audio/speak` | Synthesize text to an MP3 audio file using TTS. |

---

## 12. Supported File Formats

| Category | Extensions | Processing Method |
| :--- | :--- | :--- |
| **Documents** | `.pdf`, `.docx`, `.doc`, `.txt`, `.md` | Text extraction (`pypdf`, `python-docx`), chunking, vector indexing. |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.webp` | Gemini Multimodal Vision API inspection. |
| **Audio** | `.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm` | Voice transcription via Gemini Audio / Web Speech API. |
| **Generated Output** | `.docx`, `.txt`, `.md`, `.mp3` | Formatted Word document generation, text files, and gTTS audio clips. |

---

## 13. Example Workflows & Usage

### A. Image Analysis
1. Click the **Paperclip icon** in the chat input.
2. Select an image diagram (e.g. `architecture_diagram.png`).
3. Type: *"Explain this diagram and its main components."*
4. The system inspects the image via the multimodal pipeline and returns an explanation.

### B. Document Q&A with RAG
1. Attach a PDF or Word document (e.g., `company_policy.pdf`).
2. Ask: *"What does chapter 2 say about remote work equipment?"*
3. The RAG service extracts the text, segments it into chunks, performs similarity search, injects the retrieved context into the prompt, and generates a grounded answer with source citations.

### C. Live Web Search
1. Ask a question regarding recent events: *"What are the latest developments in AI this week?"*
2. The search service detects temporal keywords (`latest`, `this week`), executes a DuckDuckGo search, and provides current facts with clickable external links.
3. If you ask a conceptual question like *"What is Python?"*, web search is automatically bypassed.

### D. Non-Destructive Document Editing
1. Upload `resume.docx`.
2. Click **Request Edit** on the document preview chip or ask in chat: *"Change my objective and add Python to my skills."*
3. The backend generates a new file (e.g. `Updated_resume_abc123.docx`).
4. The user can click **Download** to receive the updated document. The original file remains untouched.

### E. Emotional Assistance & Safety
1. Express distress: *"I feel completely overwhelmed by my work and stressed out."*
2. The chatbot responds empathetically, validates your feelings, recommends gentle breathing/grounding exercises, and asks a supportive follow-up question.
3. If immediate self-harm triggers are detected, the system immediately displays 24/7 crisis hotlines (**988 Lifeline**, **Crisis Text Line 741741**, and international resources).

---

## 14. Security Considerations

- **No Hardcoded Secrets**: All API keys, database credentials, and host settings are managed strictly via `.env`.
- **Git Ignore Protection**: `.env`, uploaded user files, and database files are excluded via `.gitignore`.
- **Safe Filename Sanitization**: Filenames are sanitized via regular expressions to prevent path traversal attacks (`../`).
- **File Upload Restrictions**: Enforces an explicit extension whitelist (`.pdf`, `.docx`, `.txt`, `.md`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.mp3`, `.wav`, etc.) and a 25MB file size limit.
- **Client Security**: API keys are never passed to the React frontend; all AI and search queries are mediated through backend endpoints.

---

## 15. Limitations & Future Improvements

### Current MVP Limitations
- Multi-user authentication and authorization are intentionally excluded in this MVP.
- Complex image generation and video processing are deferred to maintain a lightweight codebase.
- In environments without pgvector, vector search uses normalized feature hash embeddings for zero-dependency execution.

### Future Improvements
- User authentication with JWT or OAuth (Google/GitHub login).
- Native pgvector cosine distance operators (`<=>`) in PostgreSQL queries.
- Integration of local Whisper models for offline voice transcription.
- Multi-document comparative analysis and cross-file RAG indexing.

---

## 16. Troubleshooting

### 1. `Could not connect to PostgreSQL`
- **Cause**: PostgreSQL is not installed or not running on port 5432.
- **Solution**: The application automatically falls back to local SQLite (`multimodal_chatbot.db`). If you want to use PostgreSQL, ensure your Postgres service is started (`net start postgresql` or Docker) and verify `DATABASE_URL` in `backend/.env`.

### 2. `Gemini API key not found`
- **Cause**: `GEMINI_API_KEY` is not set in `backend/.env`.
- **Solution**: The application runs in local AI mode with deterministic intelligent responses. To enable live Gemini 2.5 Flash, add your key from [Google AI Studio](https://aistudio.google.com/app/apikey) into `backend/.env`.

### 3. Microphone voice input not working
- **Cause**: Browser microphone permissions are blocked.
- **Solution**: In your browser address bar, click the site settings/lock icon and allow Microphone permissions for `localhost:5173`.

---

## 17. Contributors & Acknowledgments

- Built with modern AI engineering standards following Google Gemini and FastAPI best practices.
- Created as a clean, modular, and extensible Multimodal AI Chatbot MVP.
