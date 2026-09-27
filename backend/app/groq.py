"""Groq chat-completions call shared by the AI summary and translation."""

import re
import time

import httpx

from app.config import get_settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def _wait_seconds(r: httpx.Response) -> float:
    """How long Groq asks us to wait after a 429 (Retry-After, else the token-reset header)."""
    if ra := r.headers.get("retry-after"):
        return float(ra)
    reset = r.headers.get("x-ratelimit-reset-tokens", "")  # e.g. "36.72s" or "1m2.5s"
    m = re.fullmatch(r"(?:(\d+)m)?([\d.]+)s", reset)
    return int(m.group(1) or 0) * 60 + float(m.group(2)) if m else 10.0


def groq_chat(
    system: str, user: str, *, json_mode: bool = False, timeout: float = 10, retries: int = 0
) -> str:
    """Return the assistant text. Raises httpx.HTTPError / KeyError / ValueError on failure.
    `retries` > 0 waits and retries on 429 rate limits (free tier: 8k tokens/min) - for batch jobs,
    not for requests a user is waiting on."""
    settings = get_settings()
    if not settings.groq_api_key:
        raise ValueError("GROQ_API_KEY is not set")
    body = {
        "model": settings.groq_model,
        "temperature": 0.3,
        # Reasoning models think before answering; the budget must cover both.
        "max_completion_tokens": 4096,
        "reasoning_effort": "low",
        "include_reasoning": False,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    for attempt in range(retries + 1):
        r = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json=body,
            timeout=timeout,
        )
        if r.status_code == 429 and attempt < retries:
            time.sleep(min(_wait_seconds(r) + 1, 65))
            continue
        break
    r.raise_for_status()
    text = r.json()["choices"][0]["message"]["content"].strip()
    if not text:
        raise ValueError("empty completion")
    return text
