import React, { useState, useRef, useEffect } from "react";
import { Send, Globe, FileText, Volume2, X, Image as ImageIcon, Sparkles } from "lucide-react";
import FileUpload from "./FileUpload";
import VoiceInput from "./VoiceInput";

export default function ChatInput({
  onSendMessage,
  conversationId,
  attachedFile,
  setAttachedFile,
  disabled
}) {
  const [content, setContent] = useState("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(null); // null = auto, true = forced, false = off
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [content]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!content.trim() && !attachedFile) return;

    const payload = {
      conversation_id: conversationId,
      content: content.trim() || (attachedFile ? `Please examine this ${attachedFile.file_type}: ${attachedFile.filename}` : "Hello"),
      input_type: attachedFile ? (attachedFile.file_type === "image" ? "image" : "document") : "text",
      image_path: attachedFile && attachedFile.file_type === "image" ? attachedFile.filename : null,
      document_ids: attachedFile && attachedFile.document_id ? [attachedFile.document_id] : null,
      enable_web_search: webSearchEnabled,
      enable_rag: ragEnabled,
      enable_tts: ttsEnabled
    };

    onSendMessage(payload);
    setContent("");
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceTranscript = (text) => {
    setContent((prev) => (prev ? `${prev} ${text}` : text));
  };

  return (
    <div style={{
      padding: "12px 20px 16px",
      backgroundColor: "var(--bg-secondary)",
      borderTop: "1px solid var(--border-color)",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    }}>
      {/* Attached file preview chip */}
      {attachedFile && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          alignSelf: "flex-start",
          padding: "6px 12px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-hover)",
          borderRadius: "var(--radius-md)",
          fontSize: "12px",
          color: "var(--text-main)"
        }}>
          {attachedFile.file_type === "image" ? (
            <ImageIcon size={14} color="var(--accent-purple)" />
          ) : (
            <FileText size={14} color="var(--accent-emerald)" />
          )}
          <span style={{ fontWeight: 600, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {attachedFile.filename}
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
            ({attachedFile.file_type})
          </span>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            style={{ color: "var(--text-muted)", marginLeft: "4px" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input container */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "8px",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-lg)",
        padding: "8px 12px",
        boxShadow: "var(--shadow-sm)"
      }}>
        {/* Attachment upload */}
        <FileUpload
          conversationId={conversationId}
          onUploadSuccess={(fileData) => setAttachedFile(fileData)}
          disabled={disabled}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, describe an image, query a PDF with RAG, or share how you feel..."
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-main)",
            fontFamily: "inherit",
            fontSize: "14.5px",
            lineHeight: "1.5",
            resize: "none",
            maxHeight: "160px",
            padding: "6px 4px"
          }}
        />

        {/* Voice microphone */}
        <VoiceInput
          onTranscript={handleVoiceTranscript}
          disabled={disabled}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || (!content.trim() && !attachedFile)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-full)",
            backgroundColor: (content.trim() || attachedFile) ? "var(--accent-purple)" : "var(--bg-tertiary)",
            color: (content.trim() || attachedFile) ? "#ffffff" : "var(--text-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s"
          }}
        >
          <Send size={16} />
        </button>
      </div>

      {/* Feature toggles row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px",
        fontSize: "12px",
        color: "var(--text-muted)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Web Search Toggle */}
          <button
            type="button"
            onClick={() => setWebSearchEnabled((prev) => (prev === null ? true : prev === true ? false : null))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              backgroundColor: webSearchEnabled === true
                ? "rgba(59, 130, 246, 0.2)"
                : webSearchEnabled === false
                ? "transparent"
                : "rgba(59, 130, 246, 0.08)",
              color: webSearchEnabled === true
                ? "var(--accent-blue)"
                : webSearchEnabled === false
                ? "var(--text-dim)"
                : "var(--text-muted)",
              border: `1px solid ${webSearchEnabled === true ? "var(--accent-blue)" : "var(--border-color)"}`
            }}
          >
            <Globe size={13} />
            <span>Web Search: {webSearchEnabled === null ? "Auto" : webSearchEnabled ? "Forced On" : "Off"}</span>
          </button>

          {/* RAG Toggle */}
          <button
            type="button"
            onClick={() => setRagEnabled(!ragEnabled)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              backgroundColor: ragEnabled ? "rgba(16, 185, 129, 0.15)" : "transparent",
              color: ragEnabled ? "var(--accent-emerald)" : "var(--text-dim)",
              border: `1px solid ${ragEnabled ? "var(--accent-emerald)" : "var(--border-color)"}`
            }}
          >
            <FileText size={13} />
            <span>RAG Retrieval: {ragEnabled ? "Active" : "Disabled"}</span>
          </button>

          {/* TTS Audio toggle */}
          <button
            type="button"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              backgroundColor: ttsEnabled ? "rgba(124, 58, 237, 0.2)" : "transparent",
              color: ttsEnabled ? "var(--accent-purple)" : "var(--text-dim)",
              border: `1px solid ${ttsEnabled ? "var(--accent-purple)" : "var(--border-color)"}`
            }}
          >
            <Volume2 size={13} />
            <span>Voice Response (TTS): {ttsEnabled ? "On" : "Off"}</span>
          </button>
        </div>

        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
          Shift + Enter for new line
        </span>
      </div>
    </div>
  );
}
