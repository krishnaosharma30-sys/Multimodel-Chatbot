import React, { useState } from "react";
import { FileText, Globe, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

export default function SourceList({ sources }) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  const docSources = sources.filter((s) => s.type === "document");
  const webSources = sources.filter((s) => s.type === "web");

  return (
    <div style={{
      marginTop: "12px",
      padding: "10px 14px",
      backgroundColor: "rgba(30, 34, 48, 0.7)",
      border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-md)",
      fontSize: "13px"
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          fontWeight: 600,
          color: "var(--text-muted)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📚 Sources Referenced ({sources.length})</span>
          {docSources.length > 0 && (
            <span style={{
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "var(--accent-emerald)",
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              fontSize: "11px",
              fontWeight: 500
            }}>
              {docSources.length} Document{docSources.length > 1 ? "s" : ""}
            </span>
          )}
          {webSources.length > 0 && (
            <span style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "var(--accent-blue)",
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              fontSize: "11px",
              fontWeight: 500
            }}>
              {webSources.length} Web
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {docSources.map((src, i) => (
            <div 
              key={`doc-${i}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                padding: "8px 10px",
                backgroundColor: "var(--bg-card)",
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid var(--accent-emerald)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "var(--text-main)" }}>
                  <FileText size={14} color="var(--accent-emerald)" />
                  {src.filename} (Section {src.section})
                </span>
                <span style={{ fontSize: "11px", color: "var(--accent-emerald)", fontWeight: 500 }}>
                  Similarity: {(src.score * 100).toFixed(0)}%
                </span>
              </div>
              {src.snippet && (
                <p style={{ color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic", margin: "2px 0 0 0" }}>
                  "{src.snippet}..."
                </p>
              )}
            </div>
          ))}

          {webSources.map((src, i) => (
            <div 
              key={`web-${i}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                padding: "8px 10px",
                backgroundColor: "var(--bg-card)",
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid var(--accent-blue)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <a 
                  href={src.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 600,
                    color: "var(--accent-blue)",
                    textDecoration: "none"
                  }}
                >
                  <Globe size={14} />
                  {src.title || src.url}
                  <ExternalLink size={12} />
                </a>
              </div>
              {src.snippet && (
                <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "2px 0 0 0" }}>
                  {src.snippet}...
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
