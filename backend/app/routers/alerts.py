"""Things the family should act on: low adherence this week, and medicines running out."""

from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter
from pydantic import BaseModel
from sqlmodel import col, select

from app.auth import SessionDep, UserDep
from app.models import Medicine
from app.routers.doses import NowDep, family_now, visible_profiles
from app.routers.medicines import days_left, times_by_medicine
from app.schedule import build_schedule

router = APIRouter(tags=["alerts"])

LOW_ADHERENCE = 80  # percent over the last 7 days
REFILL_DAYS = 5  # warn when the stock lasts this many days or fewer


class LowAdherence(BaseModel):
    profile_id: int
    name: str
    percent: int
    taken: int
    due: int


class Refill(BaseModel):
    medicine_id: int
    name: str
    strength: str
    profile_id: int
    profile_name: str
    pills_left: int
    days_left: int


class AlertsOut(BaseModel):
    low_adherence: list[LowAdherence]
    refills: list[Refill]


@router.get("/alerts")
def alerts(user: UserDep, session: SessionDep, now: NowDep) -> AlertsOut:
    local_now = family_now(session, user, now)
    today = local_now.date()
    profiles = visible_profiles(session, user, None)
    names = {p.id: p.name for p in profiles}

    counts: dict[int, list[int]] = defaultdict(lambda: [0, 0])  # profile -> [taken, due]
    for d in build_schedule(session, profiles, today - timedelta(days=6), today, local_now):
        if d.status != "pending":
            counts[d.profile_id][1] += 1
            counts[d.profile_id][0] += d.status == "taken"
    low = [
        LowAdherence(
            profile_id=pid, name=names[pid], percent=round(100 * t / due), taken=t, due=due
        )
        for pid, (t, due) in counts.items()
        if due and round(100 * t / due) < LOW_ADHERENCE
    ]
    low.sort(key=lambda a: a.percent)

    meds = session.exec(
        select(Medicine).where(
            col(Medicine.profile_id).in_(names),
            col(Medicine.active),
            col(Medicine.pills_left).is_not(None),
        )
    ).all()
    times = times_by_medicine(session, [m.id for m in meds])
    refills = []
    for m in meds:
        left = days_left(m, len(times[m.id]))
        if left is not None and left <= REFILL_DAYS:
            refills.append(
                Refill(
                    medicine_id=m.id,
                    name=m.name,
                    strength=m.strength,
                    profile_id=m.profile_id,
                    profile_name=names[m.profile_id],
                    pills_left=m.pills_left,
                    days_left=left,
                )
            )
    refills.sort(key=lambda r: r.days_left)
    return AlertsOut(low_adherence=low, refills=refills)
