import os
import io
import wave
import base64
import logging
import httpx
from dotenv import load_dotenv
from fastapi import HTTPException
from sarvamai import SarvamAI

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE    = "https://api.sarvam.ai"
TTS_CHUNK_SIZE = 450   # Sarvam TTS safe character limit per request

logger = logging.getLogger("spa.voice")


async def speech_to_text(audio_bytes: bytes, language: str = "en-IN") -> str:
    if not SARVAM_API_KEY:
        raise HTTPException(status_code=500, detail="Speech-to-text service not configured")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{SARVAM_BASE}/v1/speech-to-text",
                headers={"Authorization": f"Bearer {SARVAM_API_KEY}"},
                files={"file": ("audio.wav", audio_bytes, "audio/wav")},
                data={"model": "saarika:v2.5", "language_code": language},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            status = e.response.status_code if e.response is not None else "?"
            try:
                body_text = e.response.text
            except Exception:
                body_text = "<unavailable>"
            logger.error("Sarvam STT failed: status=%s body=%s", status, body_text)
            raise HTTPException(status_code=502, detail=f"Speech-to-text error ({status})") from e
        except Exception:
            logger.exception("Unexpected STT error")
            raise HTTPException(status_code=502, detail="Speech-to-text service error")

    return response.json().get("transcript", "")


def _chunk_text(text: str, max_chars: int = TTS_CHUNK_SIZE) -> list[str]:
    """Split text on sentence boundaries, keeping each chunk under max_chars."""
    import re
    # Split on sentence-ending punctuation
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks, current = [], ""
    for sentence in sentences:
        if not sentence.strip():
            continue
        # If a single sentence is too long, hard-split it
        if len(sentence) > max_chars:
            words = sentence.split()
            for word in words:
                if len(current) + len(word) + 1 > max_chars:
                    if current:
                        chunks.append(current.strip())
                    current = word
                else:
                    current = (current + " " + word).strip()
        elif len(current) + len(sentence) + 1 > max_chars:
            if current:
                chunks.append(current.strip())
            current = sentence
        else:
            current = (current + " " + sentence).strip()
    if current:
        chunks.append(current.strip())
    return chunks


def _call_tts_sdk(text: str, language: str) -> bytes:
    """Call Sarvam TTS SDK for a single chunk and return raw WAV bytes."""
    client   = SarvamAI(api_subscription_key=SARVAM_API_KEY)
    response = client.text_to_speech.convert(
        text=text,
        target_language_code=language,
        speaker="priya",
        pace=1.25,
        speech_sample_rate=16000,
        enable_preprocessing=True,
        model="bulbul:v3",
    )
    if not (hasattr(response, "audios") and response.audios):
        raise ValueError("Empty audios in TTS response")

    audio_data = response.audios[0]
    if isinstance(audio_data, bytes):
        return audio_data
    if isinstance(audio_data, str):
        return base64.b64decode(audio_data)
    raise ValueError(f"Unexpected audio type: {type(audio_data)}")


def _concat_wav(wav_chunks: list[bytes]) -> bytes:
    """Concatenate multiple WAV byte blobs into one WAV file."""
    if len(wav_chunks) == 1:
        return wav_chunks[0]

    frames_list, params = [], None
    for chunk in wav_chunks:
        with wave.open(io.BytesIO(chunk), "rb") as wf:
            if params is None:
                params = wf.getparams()
            frames_list.append(wf.readframes(wf.getnframes()))

    out = io.BytesIO()
    with wave.open(out, "wb") as wf:
        wf.setparams(params)
        for frames in frames_list:
            wf.writeframes(frames)
    return out.getvalue()


async def text_to_speech(text: str, language: str = "en-IN") -> bytes:
    if not SARVAM_API_KEY:
        raise HTTPException(status_code=500, detail="Text-to-speech service not configured")

    try:
        chunks = _chunk_text(text)
        logger.info("TTS: %d chunk(s) for %d chars", len(chunks), len(text))

        wav_chunks = []
        for i, chunk in enumerate(chunks):
            logger.info("TTS chunk %d/%d (%d chars)", i + 1, len(chunks), len(chunk))
            wav_chunks.append(_call_tts_sdk(chunk, language))

        audio = _concat_wav(wav_chunks)
        logger.info("TTS done: %d bytes total", len(audio))
        return audio

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("TTS error: %s", e)
        raise HTTPException(status_code=502, detail="Text-to-speech service error")