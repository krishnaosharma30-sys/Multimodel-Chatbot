import React, { useRef, useState } from "react";
import { Paperclip, Image, FileText, UploadCloud, X, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { uploadFile } from "../services/api";

export default function FileUpload({ conversationId, onUploadSuccess, disabled }) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    setIsUploading(true);

    try {
      const result = await uploadFile(file, conversationId);
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err) {
      setErrorMsg(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      // reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg"
        style={{ display: "none" }}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        title="Attach file (PDF, DOCX, Image, Audio)"
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "var(--radius-full)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isUploading ? "rgba(124, 58, 237, 0.2)" : "transparent",
          color: isUploading ? "var(--accent-purple)" : "var(--text-muted)",
          transition: "all 0.2s"
        }}
      >
        {isUploading ? (
          <Loader size={18} className="animate-spin" />
        ) : (
          <Paperclip size={18} />
        )}
      </button>

      {errorMsg && (
        <div style={{
          position: "absolute",
          bottom: "45px",
          left: "0",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--accent-rose)",
          color: "var(--accent-rose)",
          fontSize: "12px",
          padding: "6px 10px",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap",
          zIndex: 10,
          boxShadow: "var(--shadow-md)"
        }}>
          <AlertCircle size={14} />
          {errorMsg}
          <button 
            type="button" 
            onClick={() => setErrorMsg("")} 
            style={{ color: "var(--text-dim)", marginLeft: "4px" }}
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
