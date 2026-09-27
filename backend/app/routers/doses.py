from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth import SessionDep, UserDep, get_accessible_profile
from app.formatting import fmt_date, fmt_time
from app.models import AppUser, DoseLog, DoseStatus, Family, Medicine, Profile, Role, utcnow
from app.routers.medicines import times_for
from app.schedule import DoseItem, build_schedule

router = APIRouter(tags=["doses"])

EARLY_MARK_LIMIT = timedelta(hours=1)  # a dose may be marked taken up to 1 h before its time


def get_now() -> datetime:
    """Current time; overridden in tests."""
    return datetime.now(UTC)


NowDep = Annotated[datetime, Depends(get_now)]


def family_now(session: Session, user: AppUser, now: datetime) -> datetime:
    return now.astimezone(ZoneInfo(session.get(Family, user.family_id).timezone))


def visible_profiles(session: Session, user: AppUser, profile_id: int | None) -> list[Profile]:
    if profile_id is not None:
        return [get_accessible_profile(session, user, profile_id)]
    if user.role == Role.member:
        return [get_accessible_profile(session, user, user.profile_id)] if user.profile_id else []
    return list(session.exec(select(Profile).where(Profile.family_id == user.family_id)))


class ScheduleOut(BaseModel):
    date: date
    timezone: str
    now: datetime
    doses: list[DoseItem]


@router.get("/schedule")
def get_schedule(
    user: UserDep,
    session: SessionDep,
    now: NowDep,
    date: date | None = None,
    profile_id: int | None = None,
) -> ScheduleOut:
    local_now = family_now(session, user, now)
    day = date or local_now.date()
    profiles = visible_profiles(session, user, profile_id)
    return ScheduleOut(
        date=day,
        timezone=str(local_now.tzinfo),
        now=local_now,
        doses=build_schedule(session, profiles, day, day, local_now),
    )


class DoseMarkIn(BaseModel):
    medicine_id: int
    date: date
    time: time
    status: Literal["taken", "skipped", "pending"]  # "pending" = undo


def _unprocessable(msg: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, msg)


@router.post("/doses/mark")
def mark_dose(body: DoseMarkIn, user: UserDep, session: SessionDep, now: NowDep) -> DoseItem:
    med = session.get(Medicine, body.medicine_id)
    if med is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found.")
    profile = get_accessible_profile(session, user, med.profile_id)  # members: own doses only
    local_now = family_now(session, user, now)
    t = body.time.replace(second=0, microsecond=0)
    at = datetime.combine(body.date, t, tzinfo=local_now.tzinfo)

    if body.date < med.start_date or (med.end_date and body.date > med.end_date):
        raise _unprocessable(f"{med.name} is not scheduled on {fmt_date(body.date)}.")
    existing = session.exec(
        select(DoseLog).where(
            DoseLog.medicine_id == med.id,
            DoseLog.scheduled_date == body.date,
            DoseLog.scheduled_time == t,
        )
    ).first()
    if existing is None and t not in times_for(session, med.id):
        raise _unprocessable(f"{med.name} is not scheduled at {fmt_time(t)}.")
    if body.status != "pending" and at - local_now > EARLY_MARK_LIMIT:
        raise _unprocessable(
            f"This dose is not due until {fmt_time(t)} on {fmt_date(body.date)}. "
            "You can mark it up to 1 hour early."
        )

    was_taken = existing is not None and existing.status == DoseStatus.taken
    if body.status == "pending":
        if existing:
            session.delete(existing)
            session.commit()
    else:
        _upsert(session, existing, med.id, body.date, t, DoseStatus(body.status), user)
    _adjust_stock(session, med, was_taken, body.status == "taken")

    items = build_schedule(session, [profile], body.date, body.date, local_now)
    return next(i for i in items if i.medicine_id == med.id and i.time == t)


def _adjust_stock(session: Session, med: Medicine, was_taken: bool, now_taken: bool) -> None:
    """Keep the optional tablet count in step: taking a dose uses it, undoing gives it back."""
    if med.pills_left is None or was_taken == now_taken:
        return
    change = -med.pills_per_dose if now_taken else med.pills_per_dose
    med.pills_left = max(0, med.pills_left + change)
    session.add(med)
    session.commit()


def _upsert(session, existing, medicine_id, day, t, new_status, user) -> None:
    if existing is None:
        session.add(
            DoseLog(
                medicine_id=medicine_id,
                scheduled_date=day,
                scheduled_time=t,
                status=new_status,
                marked_by=user.id,
            )
        )
        try:
            session.commit()
            return
        except IntegrityError:  # marked concurrently (double tap) -> update that row instead
            session.rollback()
            existing = session.exec(
                select(DoseLog).where(
                    DoseLog.medicine_id == medicine_id,
                    DoseLog.scheduled_date == day,
                    DoseLog.scheduled_time == t,
                )
            ).one()
    existing.status = new_status
    existing.marked_at = utcnow()
    existing.marked_by = user.id
    session.add(existing)
    session.commit()
