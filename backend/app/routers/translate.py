"""Live UI/user-text translation via Groq, cached in the database.

Signed-out callers (e.g. the login page) get cached translations only; only signed-in users can
trigger new Groq calls, so the endpoint can't be used as a free public proxy to our Groq key.
"""

import json
import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from app.auth import Identity, SessionDep, bearer, current_identity
from app.groq import groq_chat
from app.languages import LANGUAGES
from app.models import Translation

router = APIRouter(tags=["translate"])
log = logging.getLogger(__name__)

BATCH = 40
SYSTEM = """You translate the user interface of PillPal, a medicine reminder app used by elderly
people and their families in India, from English into {language}.
Rules:
- Simple, warm, respectful everyday words an older person understands. Short.
- Keep placeholders like {{name}} or {{count}} exactly as they are.
- Keep numbers, times like 8:00 PM, and medicine names (e.g. Metformin 500 mg) unchanged.
- Use the {language} script.
Input: a JSON object of id -> English text. Output: a JSON object with the same ids -> translation.
Output only the JSON object."""


def optional_identity(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Identity | None:
    if creds is None:
        return None
    try:
        return current_identity(creds)
    except HTTPException:
        return None


class TranslateIn(BaseModel):
    lang: str
    texts: list[Annotated[str, Field(min_length=1, max_length=500)]] = Field(max_length=300)


class TranslateOut(BaseModel):
    translations: dict[str, str]


def translate_batch(lang: str, texts: list[str], retries: int = 0) -> dict[str, str]:
    """One Groq call for up to BATCH strings. Returns only the ids it got back."""
    payload = json.dumps({str(i): t for i, t in enumerate(texts)}, ensure_ascii=False)
    raw = groq_chat(
        SYSTEM.format(language=LANGUAGES[lang][0]),
        payload,
        json_mode=True,
        timeout=30,
        retries=retries,
    )
    out = json.loads(raw)
    return {
        texts[int(k)]: v.strip()
        for k, v in out.items()
        if k.isdigit() and int(k) < len(texts) and isinstance(v, str) and v.strip()
    }


def cached(session: Session, lang: str, texts: list[str]) -> dict[str, str]:
    rows = session.exec(
        select(Translation).where(Translation.lang == lang, col(Translation.source).in_(texts))
    )
    return {r.source: r.text for r in rows}


def translate_texts(session: Session, lang: str, texts: list[str], *, allow_new: bool):
    """Cache first; misses go to Groq (if allowed); anything still missing falls back to English."""
    texts = list(dict.fromkeys(texts))  # de-duplicate, keep order
    if lang == "en":
        return {t: t for t in texts}
    result = cached(session, lang, texts)
    missing = [t for t in texts if t not in result]
    if missing and allow_new:
        for i in range(0, len(missing), BATCH):
            chunk = missing[i : i + BATCH]
            try:
                fresh = translate_batch(lang, chunk)
            except httpx.HTTPError, ValueError, KeyError, json.JSONDecodeError:
                log.warning("Groq translation failed (%s)", lang, exc_info=True)
                break
            session.add_all(Translation(lang=lang, source=s, text=t) for s, t in fresh.items())
            try:
                session.commit()
            except IntegrityError:  # another request cached the same strings first
                session.rollback()
            result |= fresh
    return {t: result.get(t, t) for t in texts}


@router.post("/translate")
def translate(
    body: TranslateIn,
    session: SessionDep,
    identity: Annotated[Identity | None, Depends(optional_identity)],
) -> TranslateOut:
    if body.lang not in LANGUAGES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unsupported language.")
    return TranslateOut(
        translations=translate_texts(session, body.lang, body.texts, allow_new=identity is not None)
    )
