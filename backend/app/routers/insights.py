"""Missed-dose summary: facts computed in code, worded by Groq, with a rule-based fallback."""

import json
import logging
from collections import Counter
from datetime import date, time, timedelta
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.auth import SessionDep, UserDep, get_accessible_profile
from app.config import get_settings
from app.formatting import fmt_date
from app.routers.adherence import streak
from app.routers.doses import NowDep, family_now
from app.schedule import DoseItem, build_schedule

router = APIRouter(tags=["insights"])
log = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
SYSTEM_PROMPT = """You write short, warm summaries of medicine-taking for a family reminder app.
Readers may be elderly: use simple words and short sentences.
Write 2-4 sentences from the JSON facts, then one practical habit tip (e.g. linking a dose to a
meal or routine). Mention medicines by name. Do not give medical advice: never suggest changing,
stopping, doubling or skipping doses, and never guess why a medicine is taken. If doses were
missed, suggest checking with their doctor or pharmacist only if the facts show many misses.
Plain text only, no lists, no markdown."""


class SummaryIn(BaseModel):
    profile_id: int
    start: date | None = None
    end: date | None = None


class SummaryOut(BaseModel):
    summary: str
    source: Literal["ai", "rules"]
    facts: dict


def part_of_day(t: time) -> str:
    if t.hour < 12:
        return "morning"
    if t.hour < 17:
        return "afternoon"
    if t.hour < 21:
        return "evening"
    return "night"


def build_facts(name: str, doses: list[DoseItem], start: date, end: date) -> dict:
    due = [d for d in doses if d.status != "pending"]
    not_taken = [d for d in due if d.status in ("missed", "skipped")]
    taken = sum(d.status == "taken" for d in due)
    per_med = Counter(f"{d.medicine_name} {d.strength}" for d in not_taken)
    parts = Counter(part_of_day(d.time) for d in not_taken)
    weekdays = Counter(f"{d.date:%A}" for d in not_taken)
    return {
        "first_name": name.split()[0],
        "period": f"{fmt_date(start)} to {fmt_date(end)}",
        "doses_due": len(due),
        "taken": taken,
        "missed": sum(d.status == "missed" for d in due),
        "skipped": sum(d.status == "skipped" for d in due),
        "percent_taken": round(100 * taken / len(due)) if due else None,
        "not_taken_by_medicine": dict(per_med.most_common()),
        "most_missed_time_of_day": parts.most_common(1)[0][0] if parts else None,
        "most_missed_weekday": weekdays.most_common(1)[0][0]
        if weekdays and weekdays.most_common(1)[0][1] > 1
        else None,
    }


def rules_summary(f: dict) -> str:
    name = f["first_name"]
    if not f["doses_due"]:
        return f"No doses were due for {name} in this period yet."
    missed_total = f["missed"] + f["skipped"]
    if missed_total == 0:
        return (
            f"Wonderful! {name} took all {f['doses_due']} doses from {f['period']}. "
            "Keep up the good routine."
        )
    worst = next(iter(f["not_taken_by_medicine"]))
    parts = [
        f"{name} took {f['taken']} of {f['doses_due']} doses ({f['percent_taken']}%) "
        f"from {f['period']}.",
        f"{missed_total} dose{'s were' if missed_total > 1 else ' was'} not taken, "
        f"most often {worst}.",
    ]
    if f["most_missed_time_of_day"]:
        parts.append(
            f"Most misses happen in the {f['most_missed_time_of_day']}. Linking that dose to "
            "a daily habit, like a meal or brushing teeth, can help."
        )
    return " ".join(parts)


def groq_summary(facts: dict) -> str:
    settings = get_settings()
    r = httpx.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        json={
            "model": settings.groq_model,
            "temperature": 0.4,
            # gpt-oss models reason before answering; the budget must cover both.
            "max_completion_tokens": 1024,
            "reasoning_effort": "low",
            "include_reasoning": False,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(facts)},
            ],
        },
        timeout=10,
    )
    r.raise_for_status()
    text = r.json()["choices"][0]["message"]["content"].strip()
    if not text:
        raise ValueError("empty completion")
    return text


@router.post("/insights/missed-summary")
def missed_summary(body: SummaryIn, user: UserDep, session: SessionDep, now: NowDep) -> SummaryOut:
    profile = get_accessible_profile(session, user, body.profile_id)
    local_now = family_now(session, user, now)
    end = body.end or local_now.date()
    start = body.start or end - timedelta(days=6)
    if start > end or (end - start).days > 31:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Choose a range of up to 31 days."
        )
    # Streak needs history before `start`, so compute over a longer window.
    doses = build_schedule(session, [profile], start - timedelta(days=30), end, local_now)
    facts = build_facts(profile.name, [d for d in doses if d.date >= start], start, end)
    facts["current_streak_days"] = streak(doses, local_now.date())

    # Privacy: only first name, medicine names and dose counts leave the server.
    if get_settings().groq_api_key and facts["missed"] + facts["skipped"] > 0:
        try:
            return SummaryOut(summary=groq_summary(facts), source="ai", facts=facts)
        except httpx.HTTPError, KeyError, IndexError, ValueError:
            log.warning("Groq summary failed; using rules", exc_info=True)
    return SummaryOut(summary=rules_summary(facts), source="rules", facts=facts)
