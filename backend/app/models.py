import uuid
from datetime import UTC, date, datetime, time
from enum import StrEnum

from sqlalchemy import DateTime, UniqueConstraint
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class Role(StrEnum):
    caregiver = "caregiver"
    member = "member"


class DoseStatus(StrEnum):
    taken = "taken"
    skipped = "skipped"


class Family(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=80)
    timezone: str = Field(default="Asia/Kolkata", max_length=64)


class Profile(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    family_id: int = Field(foreign_key="family.id", index=True, ondelete="CASCADE")
    name: str = Field(max_length=80)
    date_of_birth: date | None = None
    notes: str | None = Field(default=None, max_length=500)


class AppUser(SQLModel, table=True):
    __tablename__ = "app_user"

    id: uuid.UUID = Field(primary_key=True)  # = Supabase auth.users.id
    email: str = Field(max_length=254, unique=True)
    role: Role
    family_id: int = Field(foreign_key="family.id", index=True, ondelete="CASCADE")
    profile_id: int | None = Field(default=None, foreign_key="profile.id", ondelete="SET NULL")


class Medicine(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    profile_id: int = Field(foreign_key="profile.id", index=True, ondelete="CASCADE")
    name: str = Field(max_length=120)
    strength: str = Field(max_length=60)
    rxterms_name: str | None = Field(default=None, max_length=200)
    instructions: str = Field(max_length=300)
    start_date: date
    end_date: date | None = None
    active: bool = True


class ScheduleTime(SQLModel, table=True):
    __tablename__ = "schedule_time"
    __table_args__ = (UniqueConstraint("medicine_id", "time_of_day"),)

    id: int | None = Field(default=None, primary_key=True)
    medicine_id: int = Field(foreign_key="medicine.id", index=True, ondelete="CASCADE")
    time_of_day: time


class DoseLog(SQLModel, table=True):
    __tablename__ = "dose_log"
    __table_args__ = (UniqueConstraint("medicine_id", "scheduled_date", "scheduled_time"),)

    id: int | None = Field(default=None, primary_key=True)
    medicine_id: int = Field(foreign_key="medicine.id", index=True, ondelete="CASCADE")
    scheduled_date: date = Field(index=True)
    scheduled_time: time
    status: DoseStatus
    marked_at: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True))
    marked_by: uuid.UUID


class InviteStatus(StrEnum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class Invitation(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("family_id", "email"),)

    id: int | None = Field(default=None, primary_key=True)
    family_id: int = Field(foreign_key="family.id", index=True, ondelete="CASCADE")
    email: str = Field(max_length=254, index=True)  # stored lower-case
    label: str | None = Field(default=None, max_length=60)  # e.g. "Grandpa"
    invited_by: uuid.UUID
    status: InviteStatus = InviteStatus.pending
    created_at: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True))
    responded_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
