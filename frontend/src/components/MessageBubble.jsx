import React, { useState } from "react";
import { Bot, User, Volume2, VolumeX, Download, FileText, Check, Copy } from "lucide-react";
import SourceList from "./SourceList";
import { textToSpeech } from "../services/api";

export default function MessageBubble({ message }) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";

  // Parse metadata
  let metadata = {};
  if (message.metadata_json) {
    try {
      metadata = typeof message.metadata_json === "string" 
        ? JSON.parse(message.metadata_json) 
        : message.metadata_json;
    } catch (e) {
      metadata = {};
    }
  }

  const initialAudio = metadata.audio_url || (message.output_type === "audio" ? metadata.audio_url : null);
  const sources = metadata.sources || [];
  const imagePath = metadata.image_path;
  const generatedImageUrl = metadata.generated_image_url || metadata.image_url;
  const imageFilename = metadata.image_filename || "generated_image.jpg";

  const handlePlayAudio = async () => {
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    // 1. If backend TTS MP3 is available, play it
    const activeUrl = audioUrl || initialAudio;
    if (activeUrl) {
      const fullUrl = activeUrl.startsWith("http") ? activeUrl : `http://127.0.0.1:8000${activeUrl}`;
      const audio = new Audio(fullUrl);
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => {
        setIsPlayingAudio(false);
        fallbackBrowserSpeak();
      };
      audio.play().catch(() => fallbackBrowserSpeak());
      return;
    }

    // 2. Try fetching from backend speak API
    try {
      setIsPlayingAudio(true);
      const res = await textToSpeech(message.content.slice(0, 300));
      if (res && res.audio_url) {
        setAudioUrl(res.audio_url);
        const fullUrl = `http://127.0.0.1:8000${res.audio_url}`;
        const audio = new Audio(fullUrl);
        audio.onended = () => setIsPlayingAudio(false);
        audio.play().catch(() => fallbackBrowserSpeak());
      } else {
        fallbackBrowserSpeak();
      }
    } catch (err) {
      fallbackBrowserSpeak();
    }
  };

  const fallbackBrowserSpeak = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message.content.slice(0, 400));
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format basic markdown styling for text
  const renderFormattedText = (content) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith("### ")) {
        return <h3 key={idx} style={{ fontSize: "15px", fontWeight: 700, margin: "10px 0 4px", color: "var(--text-main)" }}>{line.slice(4)}</h3>;
      }
      if (line.startsWith("## ")) {
        return <h2 key={idx} style={{ fontSize: "17px", fontWeight: 700, margin: "12px 0 6px", color: "var(--text-main)" }}>{line.slice(3)}</h2>;
      }
      if (line.startsWith("# ")) {
        return <h1 key={idx} style={{ fontSize: "19px", fontWeight: 700, margin: "14px 0 8px", color: "var(--text-main)" }}>{line.slice(2)}</h1>;
      }
      // Bullets
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} style={{ marginLeft: "18px", marginBottom: "4px" }}>
            {formatBold(line.slice(2))}
          </li>
        );
      }
      // Numbered lists
      const numMatch = line.match(/^(\d+\.)\s+(.*)/);
      if (numMatch) {
        return (
          <div key={idx} style={{ marginLeft: "16px", marginBottom: "4px", display: "flex", gap: "6px" }}>
            <span style={{ color: "var(--accent-purple)", fontWeight: 600 }}>{numMatch[1]}</span>
            <span>{formatBold(numMatch[2])}</span>
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} style={{ height: "8px" }} />;
      }
      // Normal paragraph
      return <p key={idx} style={{ marginBottom: "6px" }}>{formatBold(line)}</p>;
    });
  };

  // Helper for bold formatting (**bold**)
  const formatBold = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ color: "var(--text-main)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        display: "flex",
        gap: "12px",
        padding: "16px 20px",
        backgroundColor: isUser ? "transparent" : "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
        justifyContent: "flex-start"
      }}
    >
      {/* Avatar */}
      <div style={{
        width: "34px",
        height: "34px",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: isUser ? "rgba(99, 102, 241, 0.2)" : "linear-gradient(135deg, #7c3aed, #6366f1)",
        background: isUser ? "rgba(99, 102, 241, 0.2)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
        color: isUser ? "var(--accent-indigo)" : "#ffffff"
      }}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      {/* Content Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: isUser ? "var(--accent-indigo)" : "var(--text-main)" }}>
              {isUser ? "You" : "Multimodal AI"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>

          {!isUser && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={handlePlayAudio}
                title={isPlayingAudio ? "Stop Audio" : "Listen to Response"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  color: isPlayingAudio ? "var(--accent-rose)" : "var(--text-muted)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: isPlayingAudio ? "rgba(244, 63, 94, 0.15)" : "transparent"
                }}
              >
                {isPlayingAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{isPlayingAudio ? "Stop" : "Listen"}</span>
              </button>

              <button
                onClick={handleCopy}
                title="Copy response"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)"
                }}
              >
                {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* User uploaded image preview */}
        {imagePath && (
          <div style={{ marginBottom: "10px" }}>
            <img
              src={`http://127.0.0.1:8000/api/documents/download/${imagePath}`}
              alt="Uploaded context"
              style={{
                maxWidth: "280px",
                maxHeight: "220px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                objectFit: "cover",
                display: "block"
              }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        )}

        {/* Message Text */}
        <div style={{
          fontSize: "14.5px",
          lineHeight: "1.6",
          color: "var(--text-main)",
          wordBreak: "break-word"
        }}>
          {renderFormattedText(message.content)}
        </div>

        {/* AI Generated Image Card */}
        {generatedImageUrl && (
          <div style={{
            margin: "12px 0 6px",
            maxWidth: "520px",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            border: "1px solid var(--border-hover)",
            backgroundColor: "var(--bg-card)",
            boxShadow: "var(--shadow-md)"
          }}>
            <img
              src={generatedImageUrl.startsWith("http") ? generatedImageUrl : `http://127.0.0.1:8000${generatedImageUrl}`}
              alt={metadata.prompt || "AI Generated"}
              style={{
                width: "100%",
                maxHeight: "440px",
                objectFit: "contain",
                backgroundColor: "#0d0f17",
                display: "block"
              }}
            />
            <div style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "var(--bg-secondary)",
              borderTop: "1px solid var(--border-color)",
              flexWrap: "wrap",
              gap: "8px"
            }}>
              <span style={{ fontSize: "12.5px", color: "var(--text-muted)", fontWeight: 500 }}>
                🎨 {metadata.prompt ? `"${metadata.prompt}"` : "AI Generated Artwork"}
              </span>
              <a
                href={generatedImageUrl.startsWith("http") ? generatedImageUrl : `http://127.0.0.1:8000${generatedImageUrl}`}
                download={imageFilename}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  backgroundColor: "var(--accent-purple)",
                  color: "#ffffff",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                <Download size={13} />
                <span>Download</span>
              </a>
            </div>
          </div>
        )}

        {/* Sources list (RAG & Web) */}
        {!isUser && sources.length > 0 && (
          <SourceList sources={sources} />
        )}
      </div>
    </div>
  );
}
