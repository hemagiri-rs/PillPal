"""Dose schedule computation. Doses are not stored ahead of time: a day's doses are the active
medicines' schedule times for that date, merged with any DoseLog rows (taken/skipped)."""

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Literal

from pydantic import BaseModel
from sqlmodel import Session, col, select

from app.models import DoseLog, Medicine, Profile, ScheduleTime

MISSED_AFTER = timedelta(hours=1)

Status = Literal["taken", "skipped", "pending", "missed"]


class DoseItem(BaseModel):
    medicine_id: int
    medicine_name: str
    strength: str
    instructions: str
    profile_id: int
    profile_name: str
    date: date
    time: time
    status: Status
    due: bool  # pending and its time has arrived (drives the "due now" banner/notifications)
    marked_at: datetime | None = None


def _days(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def build_schedule(
    session: Session, profiles: list[Profile], start: date, end: date, now: datetime
) -> list[DoseItem]:
    """All doses for `profiles` between start and end (inclusive). `now` must be aware and in the
    family's timezone; dose times are wall-clock times in that zone."""
    names = {p.id: p.name for p in profiles}
    meds = session.exec(
        select(Medicine).where(
            col(Medicine.profile_id).in_(names),
            col(Medicine.active),
            Medicine.start_date <= end,
            (col(Medicine.end_date).is_(None)) | (col(Medicine.end_date) >= start),
        )
    ).all()
    med_ids = [m.id for m in meds]
    times: dict[int, set[time]] = defaultdict(set)
    for st in session.exec(select(ScheduleTime).where(col(ScheduleTime.medicine_id).in_(med_ids))):
        times[st.medicine_id].add(st.time_of_day)
    logs = {
        (lg.medicine_id, lg.scheduled_date, lg.scheduled_time): lg
        for lg in session.exec(
            select(DoseLog).where(
                col(DoseLog.medicine_id).in_(med_ids),
                DoseLog.scheduled_date >= start,
                DoseLog.scheduled_date <= end,
            )
        )
    }
    logged_times: dict[tuple[int, date], set[time]] = defaultdict(set)
    for med_id, d, t in logs:
        logged_times[(med_id, d)].add(t)

    items: list[DoseItem] = []
    for med in meds:
        first = max(start, med.start_date)
        last = min(end, med.end_date) if med.end_date else end
        for day in _days(first, last):
            # Include logged times even if the schedule was edited since, so history is kept.
            for t in sorted(times[med.id] | logged_times[(med.id, day)]):
                log = logs.get((med.id, day, t))
                at = datetime.combine(day, t, tzinfo=now.tzinfo)
                if log:
                    status: Status = log.status.value
                elif now > at + MISSED_AFTER:
                    status = "missed"
                else:
                    status = "pending"
                items.append(
                    DoseItem(
                        medicine_id=med.id,
                        medicine_name=med.name,
                        strength=med.strength,
                        instructions=med.instructions,
                        profile_id=med.profile_id,
                        profile_name=names[med.profile_id],
                        date=day,
                        time=t,
                        status=status,
                        due=status == "pending" and now >= at,
                        marked_at=log.marked_at if log else None,
                    )
                )
    items.sort(key=lambda i: (i.date, i.time, i.profile_name, i.medicine_name))
    return items
