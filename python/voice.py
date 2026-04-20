import os
import base64
import logging
import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE = "https://api.sarvam.ai"

logger = logging.getLogger("spa.voice")


async def speech_to_text(audio_bytes: bytes, language: str = "en-IN") -> str:
    if not SARVAM_API_KEY:
        logger.error("SARVAM_API_KEY not configured for speech_to_text")
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
            logger.error("Sarvam STT request failed: status=%s url=%s body=%s", status, e.request.url, body_text)
            # Surface as a 502 Bad Gateway so clients know it's an upstream error
            raise HTTPException(status_code=502, detail=f"Speech-to-text service error ({status})") from e
        except Exception:
            logger.exception("Unexpected error calling Sarvam STT")
            raise HTTPException(status_code=502, detail="Speech-to-text service error")

        return response.json().get("transcript", "")


async def text_to_speech(text: str, language: str = "en-IN") -> bytes:
    if not SARVAM_API_KEY:
        logger.error("SARVAM_API_KEY not configured for text_to_speech")
        raise HTTPException(status_code=500, detail="Text-to-speech service not configured")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{SARVAM_BASE}/v1/text-to-speech",
                headers={
                    "Authorization": f"Bearer {SARVAM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "inputs": [text],
                    "target_language_code": language,
                    "speaker": "meera",
                    "model": "bulbul:v2",
                    "audio_format": "wav",
                },
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            status = e.response.status_code if e.response is not None else "?"
            try:
                body_text = e.response.text
            except Exception:
                body_text = "<unavailable>"
            logger.error("Sarvam TTS request failed: status=%s url=%s body=%s", status, e.request.url, body_text)
            raise HTTPException(status_code=502, detail=f"Text-to-speech service error ({status})") from e
        except Exception:
            logger.exception("Unexpected error calling Sarvam TTS")
            raise HTTPException(status_code=502, detail="Text-to-speech service error")

        audio_b64 = response.json().get("audios", [None])[0]
        if not audio_b64:
            logger.error("Empty audio returned from Sarvam TTS")
            raise HTTPException(status_code=502, detail="Text-to-speech returned empty audio")
        return base64.b64decode(audio_b64)