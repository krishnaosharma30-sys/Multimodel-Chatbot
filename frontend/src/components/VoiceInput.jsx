import React, { useState, useRef } from "react";
import { Mic, MicOff, Loader } from "lucide-react";
import { transcribeAudio } from "../services/api";

export default function VoiceInput({ onTranscript, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    // 1. First try browser native Web Speech API for immediate offline/local speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event) => {
          const spokenText = event.results[0][0].transcript;
          if (spokenText && onTranscript) {
            onTranscript(spokenText);
          }
          setIsRecording(false);
        };

        recognition.onerror = (event) => {
          console.warn("Web Speech API error, falling back to MediaRecorder:", event.error);
          setIsRecording(false);
          startMediaRecorderFallback();
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn("SpeechRecognition failed to start:", err);
      }
    }

    // 2. MediaRecorder + Backend transcription fallback
    startMediaRecorderFallback();
  };

  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsTranscribing(true);
        try {
          const res = await transcribeAudio(audioBlob);
          if (res && res.text && onTranscript) {
            onTranscript(res.text);
          }
        } catch (err) {
          console.error("Transcription error:", err);
        } finally {
          setIsTranscribing(false);
        }
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access is needed for voice input. Please allow microphone permissions in your browser.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <button
      type="button"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || isTranscribing}
      title={isRecording ? "Click to stop recording" : "Click to speak (Voice input)"}
      style={{
        width: "38px",
        height: "38px",
        borderRadius: "var(--radius-full)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isRecording
          ? "rgba(244, 63, 94, 0.2)"
          : isTranscribing
          ? "rgba(245, 158, 11, 0.2)"
          : "transparent",
        color: isRecording
          ? "var(--accent-rose)"
          : isTranscribing
          ? "var(--accent-amber)"
          : "var(--text-muted)",
        border: isRecording ? "1px solid var(--accent-rose)" : "none",
        transition: "all 0.2s"
      }}
    >
      {isTranscribing ? (
        <Loader size={18} className="animate-spin" />
      ) : isRecording ? (
        <MicOff size={18} className="animate-pulse" />
      ) : (
        <Mic size={18} />
      )}
    </button>
  );
}
