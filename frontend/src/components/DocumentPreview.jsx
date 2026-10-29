import React, { useState } from "react";
import { FileText, Download, Edit3, CheckCircle, RefreshCw, Sparkles } from "lucide-react";
import { editDocument } from "../services/api";

export default function DocumentPreview({ document, onEditSuccess }) {
  const [isEditing, setIsEditing] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [targetFormat, setTargetFormat] = useState(document.file_type || "docx");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  if (!document) return null;

  const downloadUrl = document.download_url || `http://127.0.0.1:8000/api/documents/download/${document.filename}`;

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!instructions.trim()) return;

    setLoading(true);
    setStatusMsg("");
    try {
      const res = await editDocument({
        documentId: document.id || document.document_id,
        instructions: instructions.trim(),
        format: targetFormat
      });
      setStatusMsg("Document modified successfully!");
      if (onEditSuccess) onEditSuccess(res);
      setTimeout(() => {
        setIsEditing(false);
        setInstructions("");
        setStatusMsg("");
      }, 1500);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: "var(--bg-card)",
      border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-md)",
      padding: "12px 16px",
      margin: "8px 0",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(124, 58, 237, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-purple)"
          }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-main)" }}>
              {document.filename}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
              {document.file_type ? document.file_type.toUpperCase() : "DOC"} Document
              {document.chunk_count ? ` • ${document.chunk_count} RAG Chunks Indexed` : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <a
            href={downloadUrl}
            download={document.filename}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-main)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: 500,
              textDecoration: "none",
              border: "1px solid var(--border-color)"
            }}
          >
            <Download size={14} />
            Download
          </a>

          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              backgroundColor: isEditing ? "var(--accent-purple)" : "rgba(124, 58, 237, 0.15)",
              color: isEditing ? "#fff" : "var(--accent-purple)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: 500,
              border: "1px solid rgba(124, 58, 237, 0.3)"
            }}
          >
            <Edit3 size={14} />
            {isEditing ? "Close Edit" : "Request Edit"}
          </button>
        </div>
      </div>

      {isEditing && (
        <form onSubmit={handleEdit} style={{
          marginTop: "6px",
          padding: "12px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "var(--radius-sm)",
          border: "1px dashed var(--border-hover)",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-purple)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={14} />
            Describe edits to apply to this document (original stays intact):
          </div>

          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Change my career objective and add Python and FastAPI to my skills list..."
            rows={3}
            style={{
              width: "100%",
              padding: "8px 10px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-main)",
              fontFamily: "inherit",
              fontSize: "13px",
              resize: "vertical"
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
              <span>Output Format:</span>
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px"
                }}
              >
                <option value="docx">DOCX (.docx)</option>
                <option value="txt">Plain Text (.txt)</option>
                <option value="md">Markdown (.md)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !instructions.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                backgroundColor: "var(--accent-purple)",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                fontWeight: 600
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Generating Updated File...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Updated Document
                </>
              )}
            </button>
          </div>

          {statusMsg && (
            <div style={{
              fontSize: "12px",
              color: statusMsg.startsWith("Error") ? "var(--accent-rose)" : "var(--accent-emerald)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <CheckCircle size={14} />
              {statusMsg}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
