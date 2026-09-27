from collections import Counter, defaultdict
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.auth import SessionDep, UserDep
from app.routers.doses import NowDep, family_now, visible_profiles
from app.schedule import DoseItem, build_schedule

router = APIRouter(tags=["adherence"])

MAX_RANGE_DAYS = 92
STREAK_LOOKBACK_DAYS = 60


class Counts(BaseModel):
    taken: int = 0
    skipped: int = 0
    missed: int = 0
    pending: int = 0
    percent: int | None = None  # taken / (taken + skipped + missed); None when nothing is due yet


class DayCounts(Counts):
    date: date


class MedicineCounts(Counts):
    medicine_id: int
    name: str
    strength: str
    profile_name: str


class AdherenceOut(BaseModel):
    start: date
    end: date
    overall: Counts
    days: list[DayCounts]
    medicines: list[MedicineCounts]
    streak_days: int


def count(doses: list[DoseItem], **extra):
    c = Counter(d.status for d in doses)
    due = c["taken"] + c["skipped"] + c["missed"]
    percent = round(100 * c["taken"] / due) if due else None
    fields = {k: c[k] for k in ("taken", "skipped", "missed", "pending")}
    return fields | {"percent": percent} | extra


def streak(doses: list[DoseItem], today: date) -> int:
    """Consecutive days, counting back from today, on which every due dose was taken.
    Days with nothing due yet (e.g. this morning) neither break nor extend the streak."""
    by_day: dict[date, list[DoseItem]] = defaultdict(list)
    for d in doses:
        by_day[d.date].append(d)
    days = 0
    for offset in range(STREAK_LOOKBACK_DAYS):
        statuses = {d.status for d in by_day.get(today - timedelta(days=offset), [])} - {"pending"}
        if not statuses:
            continue
        if statuses != {"taken"}:
            break
        days += 1
    return days


@router.get("/adherence")
def get_adherence(
    user: UserDep,
    session: SessionDep,
    now: NowDep,
    profile_id: int | None = None,
    start: Annotated[date | None, Query(alias="from")] = None,
    end: Annotated[date | None, Query(alias="to")] = None,
) -> AdherenceOut:
    local_now = family_now(session, user, now)
    today = local_now.date()
    end = end or today
    start = start or end - timedelta(days=6)
    if start > end:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "'from' must be before 'to'.")
    if (end - start).days >= MAX_RANGE_DAYS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Choose a range of {MAX_RANGE_DAYS} days or less.",
        )
    profiles = visible_profiles(session, user, profile_id)
    # One schedule build covers both the requested range and the streak lookback.
    history_start = min(start, today - timedelta(days=STREAK_LOOKBACK_DAYS - 1))
    history = build_schedule(session, profiles, history_start, max(end, today), local_now)
    doses = [d for d in history if start <= d.date <= end]

    by_med: dict[int, list[DoseItem]] = defaultdict(list)
    for d in doses:
        by_med[d.medicine_id].append(d)
    medicines = [
        MedicineCounts(
            **count(
                items,
                medicine_id=med_id,
                name=items[0].medicine_name,
                strength=items[0].strength,
                profile_name=items[0].profile_name,
            )
        )
        for med_id, items in by_med.items()
    ]
    medicines.sort(key=lambda m: (m.percent if m.percent is not None else 101, m.name))

    days = []
    d = start
    while d <= end:
        days.append(DayCounts(**count([x for x in doses if x.date == d], date=d)))
        d += timedelta(days=1)

    return AdherenceOut(
        start=start,
        end=end,
        overall=Counts(**count(doses)),
        days=days,
        medicines=medicines,
        streak_days=streak(history, today),
    )
