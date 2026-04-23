// lib/api.js
// All calls go directly to FastAPI on :8000 — Express is gone.

const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ── Helper ────────────────────────────────────────────────────────────────────

async function handleResponse(res) {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j.detail || j.error || detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res;
}

// ── Analysis ──────────────────────────────────────────────────────────────────

export async function analyseStudent(payload) {
  const res = await fetch(`${BASE}/analyse`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  console.log("Analyse request sent, payload:", payload.personalized_feedback);
  await handleResponse(res);
  const result = await res.json();
  console.log("LLM feedback output:", result.personalized_feedback);
  return result;
  await handleResponse(res);
  return res.json();
}

// ── PDF ingestion ─────────────────────────────────────────────────────────────

export async function ingestSyllabus(file, collectionName = "syllabus_default") {
  const form = new FormData();
  form.append("file", file);
  form.append("collection_name", collectionName);

  const res = await fetch(`${BASE}/ingest`, { method: "POST", body: form });
  await handleResponse(res);
  return res.json();
}

// ── Collections ───────────────────────────────────────────────────────────────

export async function getCollections() {
  const res = await fetch(`${BASE}/collections`);
  await handleResponse(res);
  return res.json();
}

// ── Voice: STT ────────────────────────────────────────────────────────────────
// blob      — Blob from MediaRecorder (audio/webm)
// language  — BCP-47 tag e.g. "en-IN"

export async function speechToText(blob, language = "en-IN") {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  form.append("language", language);

  const res = await fetch(`${BASE}/voice/stt`, { method: "POST", body: form });
  await handleResponse(res);
  return res.json(); // { transcript: "..." }
}

// ── Voice: TTS ────────────────────────────────────────────────────────────────
// Returns a Blob (audio/wav) ready to play

export async function textToSpeech(text, language = "en-IN", speaker = "meera") {
  const form = new FormData();
  form.append("text", text);
  form.append("language", language);
  form.append("speaker", speaker);

  const res = await fetch(`${BASE}/voice/tts`, { method: "POST", body: form });
  await handleResponse(res);
  return res.blob();
}

// ── Voice: Ask (LLM answer) ───────────────────────────────────────────────────
// Returns { answer: string, audio_base64: string }

export async function voiceAsk(question, analysisResult = null, language = "en-IN") {
  const res = await fetch(`${BASE}/voice/ask`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ question, analysis_result: analysisResult, language }),
  });
  await handleResponse(res);
  return res.json();
}

// ── Audio playback helper ─────────────────────────────────────────────────────

export async function playAudioBlob(blob) {
  const url    = URL.createObjectURL(blob);
  const audio  = new Audio(url);
  return new Promise((resolve, reject) => {
    audio.onended  = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror  = (e) => { URL.revokeObjectURL(url); reject(e); };
    audio.play().catch(reject);
  });
}

// ── Play audio from base64 string ────────────────────────────────────────────

export function playAudioBase64(base64) {
  const bytes  = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob   = new Blob([bytes], { type: "audio/wav" });
  return playAudioBlob(blob);
}