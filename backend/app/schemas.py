"""Request/response bodies. Kept separate from table models so the API contract is explicit."""

import uuid
from datetime import date

from pydantic import BaseModel, Field

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
