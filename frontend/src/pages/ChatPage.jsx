import React, { useState, useEffect } from "react";
import { 
  Plus, 
  MessageSquare, 
  FilePlus, 
  Trash2, 
  Server, 
  Database, 
  Cpu, 
  Globe, 
  X,
  AlertCircle,
  Menu,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import ChatWindow from "../components/ChatWindow";
import { 
  fetchConversations, 
  fetchConversation, 
  deleteConversation, 
  sendMessage, 
  createDocument, 
  checkHealth 
} from "../services/api";

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // New Document modal state
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docInstructions, setDocInstructions] = useState("");
  const [docFormat, setDocFormat] = useState("docx");
  const [docLoading, setDocLoading] = useState(false);
  const [docResult, setDocResult] = useState(null);

  // Initial load
  useEffect(() => {
    loadHealth();
    loadConversations();
  }, []);

  const loadHealth = async () => {
    const data = await checkHealth();
    setHealthStatus(data);
  };

  const loadConversations = async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        selectConversation(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const selectConversation = async (id) => {
    setActiveConversationId(id);
    setIsLoading(true);
    try {
      const data = await fetchConversation(id);
      setCurrentConversation(data);
      setMessages(data.messages || []);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Error loading conversation:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setCurrentConversation(null);
    setMessages([]);
    setDocuments([]);
    setAttachedFile(null);
  };

  const handleDeleteConversation = async (id, e) => {
    e?.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (err) {
      alert("Failed to delete conversation: " + err.message);
    }
  };

  const handleSendMessage = async (payload) => {
    setIsLoading(true);
    try {
      // Optimistic user message
      const tempUserMsg = {
        id: "temp-" + Date.now(),
        conversation_id: activeConversationId || "temp",
        role: "user",
        content: payload.content,
        input_type: payload.input_type || "text",
        output_type: "text",
        metadata_json: payload.image_path ? JSON.stringify({ image_path: payload.image_path }) : null,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      const res = await sendMessage(payload);

      // If new conversation was created
      if (!activeConversationId && res.conversation_id) {
        setActiveConversationId(res.conversation_id);
        setCurrentConversation({
          id: res.conversation_id,
          title: payload.content.slice(0, 30)
        });
        loadConversations();
      }

      // Replace optimistic message and append assistant response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        res.user_message,
        res.assistant_message
      ]);

      // If this conversation has documents, refresh
      if (activeConversationId) {
        const updatedConv = await fetchConversation(activeConversationId);
        setDocuments(updatedConv.documents || []);
      }
    } catch (err) {
      alert("Error sending message: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!docTitle.trim() || !docInstructions.trim()) return;

    setDocLoading(true);
    setDocResult(null);
    try {
      const res = await createDocument({
        title: docTitle.trim(),
        instructions: docInstructions.trim(),
        format: docFormat,
        conversationId: activeConversationId
      });
      setDocResult(res);
      // Refresh documents
      if (activeConversationId) {
        selectConversation(activeConversationId);
      }
    } catch (err) {
      setDocResult({ success: false, message: err.message });
    } finally {
      setDocLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? "280px" : "0px",
        height: "100%",
        backgroundColor: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s ease-in-out",
        overflow: "hidden",
        flexShrink: 0
      }}>
        {/* Brand & New Chat */}
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-sm)",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff"
              }}>
                <Cpu size={16} />
              </div>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-main)" }}>
                Multimodal AI
              </span>
            </div>
            <span style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "rgba(124, 58, 237, 0.15)",
              color: "var(--accent-purple)",
              fontWeight: 700
            }}>
              MVP
            </span>
          </div>

          <button
            onClick={handleNewChat}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "9px 14px",
              backgroundColor: "var(--accent-purple)",
              color: "#ffffff",
              borderRadius: "var(--radius-md)",
              fontWeight: 600,
              fontSize: "13.5px",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversations History List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", padding: "4px 8px 8px" }}>
            Recent Conversations
          </div>

          {conversations.length === 0 ? (
            <div style={{ padding: "16px 8px", fontSize: "13px", color: "var(--text-dim)", textAlign: "center" }}>
              No chats yet. Start a conversation!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {conversations.map((c) => {
                const isActive = c.id === activeConversationId;
                return (
                  <div
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: isActive ? "var(--bg-tertiary)" : "transparent",
                      color: isActive ? "var(--text-main)" : "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "13px",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      <MessageSquare size={14} color={isActive ? "var(--accent-purple)" : "var(--text-dim)"} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.title}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      title="Delete conversation"
                      style={{ color: "var(--text-dim)", padding: "2px", display: "flex" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action: Create Document Tool */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border-color)" }}>
          <button
            onClick={() => {
              setShowDocModal(true);
              setDocResult(null);
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12.5px",
              fontWeight: 500
            }}
          >
            <FilePlus size={15} color="var(--accent-emerald)" />
            <span>Create New Document</span>
          </button>
        </div>

        {/* System Health Status Footer */}
        <div style={{
          padding: "12px 14px",
          backgroundColor: "var(--bg-primary)",
          borderTop: "1px solid var(--border-color)",
          fontSize: "11px",
          color: "var(--text-dim)",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Server size={12} color="var(--accent-emerald)" /> Backend
            </span>
            <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>Healthy</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Database size={12} color="var(--accent-blue)" /> DB
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {healthStatus?.database?.type === "postgresql" ? "PostgreSQL" : "SQLite Fallback"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Cpu size={12} color="var(--accent-purple)" /> AI Model
            </span>
            <span style={{ color: "var(--accent-purple)", fontWeight: 600 }}>
              {healthStatus?.llm_provider?.mode === "live_gemini" ? (healthStatus?.llm_provider?.model || "Gemini Flash") : "Local AI Mode"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Globe size={12} color="var(--accent-amber)" /> Web Search
            </span>
            <span style={{ color: "var(--accent-emerald)" }}>DuckDuckGo Active</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <ChatWindow
        conversation={currentConversation}
        messages={messages}
        documents={documents}
        onSendMessage={handleSendMessage}
        onClearConversation={() => activeConversationId && handleDeleteConversation(activeConversationId)}
        attachedFile={attachedFile}
        setAttachedFile={setAttachedFile}
        isLoading={isLoading}
      />

      {/* Create Document Modal */}
      {showDocModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            width: "100%",
            maxWidth: "500px",
            padding: "20px",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FilePlus size={18} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                  Create New Document
                </h3>
              </div>
              <button onClick={() => setShowDocModal(false)} style={{ color: "var(--text-dim)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDocumentSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                  Document Title
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Project Proposal or Python Cheat Sheet"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    fontSize: "13.5px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                  Content Instructions / Outline
                </label>
                <textarea
                  value={docInstructions}
                  onChange={(e) => setDocInstructions(e.target.value)}
                  placeholder="Describe sections, key points, headings, and detailed information..."
                  rows={4}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    fontSize: "13px",
                    resize: "vertical"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                  File Format
                </label>
                <select
                  value={docFormat}
                  onChange={(e) => setDocFormat(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    fontSize: "13px"
                  }}
                >
                  <option value="docx">Microsoft Word (.docx)</option>
                  <option value="txt">Plain Text (.txt)</option>
                  <option value="md">Markdown (.md)</option>
                </select>
              </div>

              {docResult && (
                <div style={{
                  padding: "10px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: docResult.success ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                  border: `1px solid ${docResult.success ? "var(--accent-emerald)" : "var(--accent-rose)"}`,
                  color: docResult.success ? "var(--accent-emerald)" : "var(--accent-rose)",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <span>{docResult.message}</span>
                  {docResult.file_url && (
                    <a
                      href={`http://127.0.0.1:8000${docResult.file_url}`}
                      download={docResult.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "var(--accent-emerald)",
                        color: "#fff",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12px",
                        fontWeight: 600,
                        textDecoration: "none"
                      }}
                    >
                      Download
                    </a>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  style={{
                    padding: "8px 14px",
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-muted)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px"
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={docLoading || !docTitle.trim() || !docInstructions.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    backgroundColor: "var(--accent-purple)",
                    color: "#ffffff",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                    fontWeight: 600
                  }}
                >
                  {docLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Document"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
