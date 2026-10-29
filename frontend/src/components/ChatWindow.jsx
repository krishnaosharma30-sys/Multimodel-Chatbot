import React, { useRef, useEffect } from "react";
import { MessageSquare, Sparkles, Image, FileText, Globe, Heart, Trash2, Loader } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import DocumentPreview from "./DocumentPreview";

export default function ChatWindow({
  conversation,
  messages,
  documents,
  onSendMessage,
  onClearConversation,
  attachedFile,
  setAttachedFile,
  isLoading
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const starterCards = [
    {
      icon: <Sparkles size={18} color="var(--accent-purple)" />,
      title: "Generate AI Images",
      prompt: "Make a high quality image of a futuristic flying car",
      badge: "AI Image Studio"
    },
    {
      icon: <FileText size={18} color="var(--accent-emerald)" />,
      title: "Query Documents (RAG)",
      prompt: "Summarize the key findings from my uploaded document.",
      badge: "Vector RAG"
    },
    {
      icon: <Globe size={18} color="var(--accent-blue)" />,
      title: "Live Web Search",
      prompt: "What are the latest developments in AI this week?",
      badge: "Web Search"
    },
    {
      icon: <Heart size={18} color="var(--accent-rose)" />,
      title: "Emotional Support",
      prompt: "I've been feeling a bit overwhelmed lately and need to talk.",
      badge: "Empathy Assistant"
    }
  ];

  return (
    <div style={{
      flex: 1,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--bg-primary)",
      overflow: "hidden"
    }}>
      {/* Top Header */}
      <div style={{
        height: "60px",
        padding: "0 20px",
        backgroundColor: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius-sm)",
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff"
          }}>
            <Sparkles size={16} />
          </div>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
              {conversation?.title || "New Conversation"}
            </h2>
            <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              {documents?.length ? `${documents.length} Document(s) in context` : "Text • Vision • Audio • RAG • Web"}
            </div>
          </div>
        </div>

        {conversation && (
          <button
            onClick={onClearConversation}
            title="Delete this conversation"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "transparent",
              color: "var(--text-dim)",
              fontSize: "12px",
              border: "1px solid var(--border-color)"
            }}
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Document preview shelf if documents attached to this conversation */}
        {documents && documents.length > 0 && (
          <div style={{ padding: "12px 20px 0" }}>
            {documents.map((doc) => (
              <DocumentPreview key={doc.id} document={doc} />
            ))}
          </div>
        )}

        {/* Empty state: Welcome hero */}
        {(!messages || messages.length === 0) ? (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            textAlign: "center"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              marginBottom: "16px",
              boxShadow: "0 0 24px rgba(124, 58, 237, 0.35)"
            }}>
              <Sparkles size={28} />
            </div>

            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
              How can I assist you today?
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "520px", marginBottom: "32px" }}>
              Ask questions, upload diagrams, index PDF & DOCX documents with RAG, 
              search current web info, or speak naturally with audio input.
            </p>

            {/* Quick starter cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
              width: "100%",
              maxWidth: "680px"
            }}>
              {starterCards.map((card, i) => (
                <div
                  key={i}
                  onClick={() => onSendMessage({ content: card.prompt })}
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "14px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-purple)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    {card.icon}
                    <span style={{ fontSize: "10.5px", color: "var(--text-dim)", fontWeight: 600 }}>
                      {card.badge}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text-main)", marginBottom: "4px" }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                    "{card.prompt}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px 20px",
                backgroundColor: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-color)"
              }}>
                <div style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "var(--radius-sm)",
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff"
                }}>
                  <Loader size={18} className="animate-spin" />
                </div>
                <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                  Multimodal AI is analyzing and formulating response...
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input container at bottom */}
      <ChatInput
        onSendMessage={onSendMessage}
        conversationId={conversation?.id}
        attachedFile={attachedFile}
        setAttachedFile={setAttachedFile}
        disabled={isLoading}
      />
    </div>
  );
}
