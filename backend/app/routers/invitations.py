"""Sign-up onboarding (start a family) and family invitations."""

from datetime import date
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlmodel import Session, select

from app.auth import CaregiverDep, IdentityDep, SessionDep
from app.models import AppUser, Family, Invitation, InviteStatus, Profile, Role, utcnow

router = APIRouter(tags=["invitations"])


# ---------- schemas ----------


class PersonIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    date_of_birth: date | None = None

    @field_validator("name")
    @classmethod
    def strip(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("Please enter a name.")
        return v


class FamilyIn(PersonIn):
    family_name: str = Field(min_length=1, max_length=80)
    timezone: str = "Asia/Kolkata"

    @field_validator("timezone")
    @classmethod
    def known_zone(cls, v: str) -> str:
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Unknown timezone.") from exc
        return v


class InviteIn(BaseModel):
    email: EmailStr
    label: str | None = Field(default=None, max_length=60)


class InviteOut(BaseModel):
    id: int
    email: str
    label: str | None
    status: InviteStatus


class MyInviteOut(BaseModel):
    id: int
    family_name: str
    invited_by_name: str
    label: str | None


# ---------- helpers ----------


def _conflict(msg: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, msg)


def _ensure_not_in_family(session: Session, identity) -> None:
    if session.get(AppUser, identity.id) is not None:
        raise _conflict("You already belong to a family in PillPal.")


def _inviter_name(session: Session, invitation: Invitation) -> str:
    inviter = session.get(AppUser, invitation.invited_by)
    if inviter and inviter.profile_id and (p := session.get(Profile, inviter.profile_id)):
        return p.name
    return inviter.email if inviter else "Someone"


def _my_pending(session: Session, identity, invitation_id: int) -> Invitation:
    inv = session.get(Invitation, invitation_id)
    if inv is None or inv.email != identity.email:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found.")
    if inv.status != InviteStatus.pending:
        raise _conflict("This invitation has already been answered.")
    return inv


# ---------- onboarding (no family yet) ----------


@router.post("/families", status_code=status.HTTP_201_CREATED)
def start_family(body: FamilyIn, identity: IdentityDep, session: SessionDep) -> dict:
    """The signed-in person starts a family and becomes its caregiver."""
    _ensure_not_in_family(session, identity)
    fam = Family(name=" ".join(body.family_name.split()), timezone=body.timezone)
    session.add(fam)
    session.flush()
    me = Profile(family_id=fam.id, name=body.name, date_of_birth=body.date_of_birth)
    session.add(me)
    session.flush()
    session.add(
        AppUser(
            id=identity.id,
            email=identity.email,
            role=Role.caregiver,
            family_id=fam.id,
            profile_id=me.id,
        )
    )
    session.commit()
    return {"family_id": fam.id, "profile_id": me.id}


@router.get("/invitations/mine")
def my_invitations(identity: IdentityDep, session: SessionDep) -> list[MyInviteOut]:
    invites = session.exec(
        select(Invitation).where(
            Invitation.email == identity.email, Invitation.status == InviteStatus.pending
        )
    ).all()
    return [
        MyInviteOut(
            id=i.id,
            family_name=session.get(Family, i.family_id).name,
            invited_by_name=_inviter_name(session, i),
            label=i.label,
        )
        for i in invites
    ]


@router.post("/invitations/{invitation_id}/accept")
def accept(invitation_id: int, body: PersonIn, identity: IdentityDep, session: SessionDep) -> dict:
    inv = _my_pending(session, identity, invitation_id)
    _ensure_not_in_family(session, identity)
    # The profile (and so reminders) only exists once the person says yes.
    profile = Profile(family_id=inv.family_id, name=body.name, date_of_birth=body.date_of_birth)
    session.add(profile)
    session.flush()
    session.add(
        AppUser(
            id=identity.id,
            email=identity.email,
            role=Role.member,
            family_id=inv.family_id,
            profile_id=profile.id,
        )
    )
    inv.status = InviteStatus.accepted
    inv.responded_at = utcnow()
    session.add(inv)
    session.commit()
    return {"family_id": inv.family_id, "profile_id": profile.id}


@router.post("/invitations/{invitation_id}/decline")
def decline(invitation_id: int, identity: IdentityDep, session: SessionDep) -> InviteOut:
    inv = _my_pending(session, identity, invitation_id)
    inv.status = InviteStatus.declined
    inv.responded_at = utcnow()
    session.add(inv)
    session.commit()
    return InviteOut.model_validate(inv, from_attributes=True)


# ---------- caregiver ----------


@router.get("/invitations")
def family_invitations(user: CaregiverDep, session: SessionDep) -> list[InviteOut]:
    rows = session.exec(
        select(Invitation)
        .where(Invitation.family_id == user.family_id)
        .order_by(Invitation.created_at.desc())
    )
    return [InviteOut.model_validate(i, from_attributes=True) for i in rows]


@router.post("/invitations", status_code=status.HTTP_201_CREATED)
def invite(body: InviteIn, user: CaregiverDep, session: SessionDep) -> InviteOut:
    email = body.email.lower()
    if email == user.email.lower():
        raise _conflict("That's your own email. Enter the email of the person you want to invite.")
    member = session.exec(select(AppUser).where(AppUser.email == email)).first()
    if member and member.family_id == user.family_id:
        raise _conflict("This person is already in your family.")
    inv = session.exec(
        select(Invitation).where(Invitation.family_id == user.family_id, Invitation.email == email)
    ).first()
    if inv and inv.status == InviteStatus.pending:
        raise _conflict("This person has already been invited. Waiting for them to answer.")
    if inv is None:
        inv = Invitation(family_id=user.family_id, email=email, invited_by=user.id)
    inv.label = body.label.strip() if body.label and body.label.strip() else None
    inv.status = InviteStatus.pending
    inv.invited_by = user.id
    inv.created_at = utcnow()
    inv.responded_at = None
    session.add(inv)
    session.commit()
    session.refresh(inv)
    return InviteOut.model_validate(inv, from_attributes=True)


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel(invitation_id: int, user: CaregiverDep, session: SessionDep) -> None:
    inv = session.get(Invitation, invitation_id)
    if inv is None or inv.family_id != user.family_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found.")
    if inv.status == InviteStatus.accepted:
        raise _conflict("This person already joined. Remove their profile instead.")
    session.delete(inv)
    session.commit()
