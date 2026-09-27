"""Request/response bodies. Kept separate from table models so the API contract is explicit."""

import uuid
from datetime import date, time

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models import Role


class MeOut(BaseModel):
    id: uuid.UUID
    email: str
    role: Role
    family_id: int
    family_name: str
    timezone: str
    profile_id: int | None


class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    date_of_birth: date | None = None
    notes: str | None = Field(default=None, max_length=500)


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    date_of_birth: date | None = None
    notes: str | None = Field(default=None, max_length=500)


class ProfileOut(BaseModel):
    id: int
    name: str
    date_of_birth: date | None
    notes: str | None


class MedicineFields(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    strength: str = Field(min_length=1, max_length=60)
    rxterms_name: str | None = Field(default=None, max_length=200)
    instructions: str = Field(min_length=1, max_length=300)
    start_date: date
    end_date: date | None = None
    active: bool = True
    times: list[time] = Field(min_length=1, max_length=8)
    pills_left: int | None = Field(default=None, ge=0, le=10000)
    pills_per_dose: int = Field(default=1, ge=1, le=20)

    @field_validator("name", "strength", "instructions")
    @classmethod
    def strip(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("This field can't be empty.")
        return v

    @field_validator("times")
    @classmethod
    def no_duplicate_times(cls, v: list[time]) -> list[time]:
        v = [t.replace(second=0, microsecond=0) for t in v]
        if len(set(v)) != len(v):
            raise ValueError("The same time is listed twice. Remove the duplicate time.")
        return sorted(v)

    @model_validator(mode="after")
    def end_after_start(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("The end date can't be before the start date.")
        return self


class MedicineIn(MedicineFields):
    profile_id: int


class MedicineUpdate(BaseModel):
    """Partial update; merged with the stored medicine and re-validated as MedicineFields."""

    name: str | None = None
    strength: str | None = None
    rxterms_name: str | None = None
    instructions: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    active: bool | None = None
    times: list[time] | None = None
    pills_left: int | None = None
    pills_per_dose: int | None = None


class MedicineOut(BaseModel):
    id: int
    profile_id: int
    name: str
    strength: str
    rxterms_name: str | None
    instructions: str
    start_date: date
    end_date: date | None
    active: bool
    times: list[time]
    pills_left: int | None
    pills_per_dose: int
    days_left: int | None = None  # how many days the stock lasts at the current schedule
    warnings: list[str] = []
