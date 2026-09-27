"""Drug-name autocomplete via the NLM Clinical Tables RxTerms API (free, no key)."""

import logging
from functools import lru_cache
from typing import Annotated

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.auth import UserDep

router = APIRouter(tags=["drugs"])
log = logging.getLogger(__name__)

RXTERMS_URL = "https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search"


class DrugSuggestion(BaseModel):
    name: str
    strengths: list[str]


def parse_rxterms(payload: list) -> list[DrugSuggestion]:
    """[total, [names], {"STRENGTHS_AND_FORMS": [[...], ...]}, ...] -> suggestions."""
    names = payload[1]
    strengths = (payload[2] or {}).get("STRENGTHS_AND_FORMS", [[] for _ in names])
    return [
        DrugSuggestion(name=n, strengths=[s.strip() for s in st])
        for n, st in zip(names, strengths, strict=True)
    ]


@lru_cache(maxsize=512)  # failures raise, so only successful lookups are cached
def fetch_rxterms(q: str) -> tuple[DrugSuggestion, ...]:
    r = httpx.get(
        RXTERMS_URL,
        params={"terms": q, "ef": "STRENGTHS_AND_FORMS", "maxList": 8},
        timeout=3,
    )
    r.raise_for_status()
    return tuple(parse_rxterms(r.json()))


@router.get("/drugs/suggest")
def suggest(
    _: UserDep, q: Annotated[str, Query(min_length=2, max_length=60)]
) -> list[DrugSuggestion]:
    try:
        return list(fetch_rxterms(" ".join(q.lower().split())))
    except httpx.HTTPError, ValueError, IndexError, TypeError:
        # Autocomplete is a convenience: never block the medicine form if RxTerms is down.
        log.warning("RxTerms lookup failed for %r", q, exc_info=True)
        return []
