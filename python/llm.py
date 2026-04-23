import os
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE    = "https://api.sarvam.ai"


async def get_feedback(prompt: str) -> str:
    if not SARVAM_API_KEY:
        return "Sarvam API key not configured. Set SARVAM_API_KEY in your .env file."

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{SARVAM_BASE}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {SARVAM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "sarvam-m",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1200,
                "temperature": 0.7,
            },
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        print("Raw Sarvam response content:", repr(content))
        # Sarvam-M is a reasoning model — wraps thinking in <tool_call>...<tool_call>
        # Split on closing tag and take only what comes AFTER it
        if "</think>" in content:
            content = content.split("</think>", 1)[1].strip()
        else:
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

        return content