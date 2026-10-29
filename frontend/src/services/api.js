/**
 * Backend API Client Service
 * Encapsulates all REST API interactions with FastAPI backend.
 */

const API_BASE = "http://127.0.0.1:8000/api";

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    console.error("Health check error:", err);
    return null;
  }
}

export async function fetchConversations() {
  const res = await fetch(`${API_BASE}/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  const data = await res.json();
  return data.conversations || [];
}

export async function fetchConversation(id) {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to load conversation");
  return await res.json();
}

export async function deleteConversation(id) {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
  return await res.json();
}

export async function sendMessage(payload) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || errData.message || "Failed to send message");
  }
  return await res.json();
}

export async function uploadFile(file, conversationId = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (conversationId) {
    formData.append("conversation_id", conversationId);
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "File upload failed");
  }
  return await res.json();
}

export async function createDocument({ title, instructions, format = "docx", conversationId = null }) {
  const res = await fetch(`${API_BASE}/documents/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      instructions,
      format,
      conversation_id: conversationId
    })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to create document");
  }
  return await res.json();
}

export async function editDocument({ documentId, instructions, format = null, conversationId = null }) {
  const res = await fetch(`${API_BASE}/documents/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_id: documentId,
      instructions,
      format,
      conversation_id: conversationId
    })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to edit document");
  }
  return await res.json();
}

export async function transcribeAudio(fileOrBlob) {
  const formData = new FormData();
  formData.append("file", fileOrBlob, "voice_input.webm");

  const res = await fetch(`${API_BASE}/audio/transcribe`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Audio transcription failed");
  return await res.json();
}

export async function textToSpeech(text) {
  const res = await fetch(`${API_BASE}/audio/speak?text=${encodeURIComponent(text)}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("TTS generation failed");
  return await res.json();
}
