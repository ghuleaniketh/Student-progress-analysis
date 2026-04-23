import { useState, useRef, useEffect } from "react";
import { speechToText, voiceAsk, playAudioBase64 } from "../lib/api";

const cx = (...a) => a.filter(Boolean).join(" ");

const SYSTEM_GREETING =
  "Hello! I'm your SPA voice assistant. You can ask me about your performance, study tips, or exam preparation. Start speaking after pressing the mic button.";

// ── Waveform visualiser (CSS-only animated bars) ──────────────────────────────
function Waveform({ active }) {
  return (
    <div className="flex items-end gap-0.5 h-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={cx(
            "w-1 rounded-full transition-all",
            active ? "bg-indigo-500" : "bg-slate-200"
          )}
          style={{
            height: active
              ? `${20 + Math.sin(i * 0.8) * 12}px`
              : "6px",
            animation: active
              ? `wave ${0.6 + i * 0.08}s ease-in-out infinite alternate`
              : "none",
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          from { height: 6px; }
          to   { height: 28px; }
        }
      `}</style>
    </div>
  );
}

// ── Single chat bubble ────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cx("flex gap-2 mb-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
        style={{
          background: isUser ? "#6366F1" : "#F1F5F9",
          color:      isUser ? "#fff"    : "#64748B",
        }}
      >
        {isUser ? "Y" : "AI"}
      </div>
      <div
        className={cx(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm"
        )}
      >
        {msg.text}
        {msg.state === "loading" && (
          <span className="inline-flex gap-1 ml-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VoiceAssistant({ analysisResult }) {
  const [messages,   setMessages]   = useState([
    { role: "assistant", text: SYSTEM_GREETING }
  ]);
  const [recording,  setRecording]  = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error,      setError]      = useState("");
  const [language,   setLanguage]   = useState("en-IN");

  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);
  const bottomRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMsg = (role, text, state = "done") =>
    setMessages((prev) => [...prev, { role, text, state }]);

  const updateLastMsg = (text) =>
    setMessages((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], text, state: "done" };
      return copy;
    });

  // ── Start recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = handleStop;
      mr.start(100);
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      setError("Microphone access denied. Please allow microphone access.");
    }
  };

  // ── Stop recording ─────────────────────────────────────────────────────────
  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
      mediaRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setRecording(false);
  };

  // ── Process audio blob → STT → LLM → TTS ──────────────────────────────────
  const handleStop = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size < 1000) return; // too short, skip

    setProcessing(true);
    try {
      // 1. STT — Sarvam transcribes the audio
      const { transcript } = await speechToText(blob, language);
      if (!transcript?.trim()) {
        setError("Could not understand audio. Try again.");
        setProcessing(false);
        return;
      }

      addMsg("user", transcript);

      // 2. LLM — /voice/ask sends transcript + analysis context to Sarvam-M
      //    and returns both the text answer and a base64 WAV
      addMsg("assistant", "…", "loading");

      const { answer, audio_base64 } = await voiceAsk(
        transcript,
        analysisResult,
        language,
      );

      updateLastMsg(answer);

      // 3. Play the TTS audio returned by the server
      if (audio_base64) {
        await playAudioBase64(audio_base64);
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
      // Remove the loading bubble if it's still there
      setMessages((prev) =>
        prev[prev.length - 1]?.state === "loading" ? prev.slice(0, -1) : prev
      );
    } finally {
      setProcessing(false);
    }
  };

  // ── Keyboard shortcut: hold Space to record ────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space" && e.target.tagName !== "INPUT" && !recording) {
        e.preventDefault();
        startRecording();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "Space" && recording) stopRecording();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
    };
  }, [recording]);

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-slate-700">Voice Assistant</span>
          <span className="text-[11px] text-slate-400">Sarvam STT · M · TTS</span>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none"
        >
          <option value="en-IN">English (India)</option>
          <option value="hi-IN">Hindi</option>
          <option value="te-IN">Telugu</option>
          <option value="ta-IN">Tamil</option>
          <option value="kn-IN">Kannada</option>
        </select>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
        {messages.map((msg, i) => (
          <Bubble key={i} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="shrink-0 px-4 pb-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <Waveform active={recording} />
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={processing}
            className={cx(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md shrink-0",
              recording
                ? "bg-red-500 scale-110 shadow-red-200"
                : processing
                ? "bg-slate-200 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105 shadow-indigo-200"
            )}
            title="Hold to speak (or hold Space)"
          >
            {processing ? (
              <svg className="animate-spin w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2z"/>
              </svg>
            )}
          </button>
          <p className="text-[11px] text-slate-400 leading-tight">
            {recording   ? "Release to send…"
             : processing ? "Processing…"
             : "Hold mic or Space to speak"}
          </p>
        </div>
      </div>
    </div>
  );
}