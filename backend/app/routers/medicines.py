from datetime import date, time

from fastapi import APIRouter, HTTPException, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlmodel import Session, col, delete, select

from app.auth import CaregiverDep, SessionDep, UserDep, get_accessible_profile
from app.formatting import fmt_date, fmt_time
from app.models import AppUser, Medicine, Profile, Role, ScheduleTime
from app.schemas import MedicineFields, MedicineIn, MedicineOut, MedicineUpdate

router = APIRouter(prefix="/medicines", tags=["medicines"])

CONFLICT_WINDOW_MIN = 30


def _norm(s: str) -> str:
    return " ".join(s.lower().split())


def _overlaps(a_start: date, a_end: date | None, b_start: date, b_end: date | None) -> bool:
    return (b_end is None or a_start <= b_end) and (a_end is None or b_start <= a_end)


def _minutes_apart(a: time, b: time) -> int:
    diff = abs((a.hour * 60 + a.minute) - (b.hour * 60 + b.minute))
    return min(diff, 24 * 60 - diff)  # 23:50 and 00:10 are 20 min apart


def times_for(session: Session, medicine_id: int) -> list[time]:
    rows = session.exec(
        select(ScheduleTime.time_of_day)
        .where(ScheduleTime.medicine_id == medicine_id)
        .order_by(ScheduleTime.time_of_day)
    )
    return list(rows)


def times_by_medicine(session: Session, medicine_ids: list[int]) -> dict[int, list[time]]:
    """All schedule times for many medicines in one query (avoids one query per medicine)."""
    out: dict[int, list[time]] = {i: [] for i in medicine_ids}
    rows = session.exec(
        select(ScheduleTime)
        .where(col(ScheduleTime.medicine_id).in_(medicine_ids))
        .order_by(ScheduleTime.time_of_day)
    )
    for st in rows:
        out[st.medicine_id].append(st.time_of_day)
    return out


def _out(
    session: Session,
    med: Medicine,
    warnings: list[str] | None = None,
    times: list[time] | None = None,
) -> MedicineOut:
    if times is None:
        times = times_for(session, med.id)
    return MedicineOut(
        **med.model_dump(),
        times=times,
        days_left=days_left(med, len(times)),
        warnings=warnings or [],
    )


def days_left(med: Medicine, doses_per_day: int) -> int | None:
    if med.pills_left is None or doses_per_day == 0:
        return None
    return med.pills_left // (med.pills_per_dose * doses_per_day)


def check_rules(
    session: Session, profile: Profile, data: MedicineFields, exclude_id: int | None = None
) -> list[str]:
    """Rule 1 (duplicate → 409) and rule 3 (timing conflict → warnings). Rules 2 and 4 live in
    the schema. Only active medicines with overlapping date ranges are compared."""
    query = select(Medicine).where(Medicine.profile_id == profile.id, col(Medicine.active))
    if exclude_id is not None:  # `id != NULL` would match nothing
        query = query.where(Medicine.id != exclude_id)
    others = session.exec(query).all()
    other_times = times_by_medicine(session, [o.id for o in others])
    warnings: list[str] = []
    if not data.active:
        return warnings
    for other in others:
        if not _overlaps(data.start_date, data.end_date, other.start_date, other.end_date):
            continue
        if _norm(other.name) == _norm(data.name) and _norm(other.strength) == _norm(data.strength):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"{other.name} {other.strength} is already added for {profile.name} "
                f"from {fmt_date(other.start_date)}. Edit the existing one instead.",
            )
        for other_t in other_times[other.id]:
            if any(_minutes_apart(t, other_t) <= CONFLICT_WINDOW_MIN for t in data.times):
                warnings.append(
                    f"{other.name} is also due at {fmt_time(other_t)}, within "
                    f"{CONFLICT_WINDOW_MIN} minutes of this medicine."
                )
    return warnings


def _save_times(session: Session, medicine_id: int, times: list[time]) -> None:
    session.exec(delete(ScheduleTime).where(col(ScheduleTime.medicine_id) == medicine_id))
    session.add_all(ScheduleTime(medicine_id=medicine_id, time_of_day=t) for t in times)


def _get_medicine(session: Session, user: AppUser, medicine_id: int, *, write=False):
    med = session.get(Medicine, medicine_id)
    if med is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found.")
    profile = get_accessible_profile(session, user, med.profile_id, write=write)
    return med, profile


@router.get("")
def list_medicines(
    user: UserDep, session: SessionDep, profile_id: int | None = None
) -> list[MedicineOut]:
    query = (
        select(Medicine)
        .join(Profile)
        .where(Profile.family_id == user.family_id)
        .order_by(col(Medicine.active).desc(), Medicine.name)
    )
    if user.role == Role.member:
        query = query.where(Medicine.profile_id == user.profile_id)
    if profile_id is not None:
        get_accessible_profile(session, user, profile_id)
        query = query.where(Medicine.profile_id == profile_id)
    meds = session.exec(query).all()
    times = times_by_medicine(session, [m.id for m in meds])
    return [_out(session, m, times=times[m.id]) for m in meds]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_medicine(body: MedicineIn, user: CaregiverDep, session: SessionDep) -> MedicineOut:
    profile = get_accessible_profile(session, user, body.profile_id, write=True)
    warnings = check_rules(session, profile, body)
    med = Medicine(**body.model_dump(exclude={"times"}))
    session.add(med)
    session.flush()
    _save_times(session, med.id, body.times)
    session.commit()
    session.refresh(med)
    return _out(session, med, warnings)


@router.get("/{medicine_id}")
def get_medicine(medicine_id: int, user: UserDep, session: SessionDep) -> MedicineOut:
    med, _ = _get_medicine(session, user, medicine_id)
    return _out(session, med)


@router.patch("/{medicine_id}")
def update_medicine(
    medicine_id: int, body: MedicineUpdate, user: CaregiverDep, session: SessionDep
) -> MedicineOut:
    med, profile = _get_medicine(session, user, medicine_id, write=True)
    merged = {**med.model_dump(), "times": times_for(session, med.id)}
    merged |= body.model_dump(exclude_unset=True)
    try:
        data = MedicineFields.model_validate(merged)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc
    warnings = check_rules(session, profile, data, exclude_id=med.id)
    med.sqlmodel_update(data.model_dump(exclude={"times"}))
    session.add(med)
    _save_times(session, med.id, data.times)
    session.commit()
    session.refresh(med)
    return _out(session, med, warnings)


@router.delete("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medicine(medicine_id: int, user: CaregiverDep, session: SessionDep) -> None:
    med, _ = _get_medicine(session, user, medicine_id, write=True)
    session.delete(med)
    session.commit()
