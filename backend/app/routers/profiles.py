from fastapi import APIRouter, status
from sqlmodel import select

from app.auth import CaregiverDep, SessionDep, UserDep, get_accessible_profile
from app.models import Profile, Role
from app.schemas import ProfileIn, ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("")
def list_profiles(user: UserDep, session: SessionDep) -> list[ProfileOut]:
    query = select(Profile).where(Profile.family_id == user.family_id).order_by(Profile.name)
    if user.role == Role.member:
        query = query.where(Profile.id == user.profile_id)
    return [ProfileOut.model_validate(p, from_attributes=True) for p in session.exec(query)]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_profile(body: ProfileIn, user: CaregiverDep, session: SessionDep) -> ProfileOut:
    profile = Profile(family_id=user.family_id, **body.model_dump())
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return ProfileOut.model_validate(profile, from_attributes=True)


@router.get("/{profile_id}")
def get_profile(profile_id: int, user: UserDep, session: SessionDep) -> ProfileOut:
    profile = get_accessible_profile(session, user, profile_id)
    return ProfileOut.model_validate(profile, from_attributes=True)


@router.patch("/{profile_id}")
def update_profile(
    profile_id: int, body: ProfileUpdate, user: CaregiverDep, session: SessionDep
) -> ProfileOut:
    profile = get_accessible_profile(session, user, profile_id, write=True)
    profile.sqlmodel_update(body.model_dump(exclude_unset=True))
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return ProfileOut.model_validate(profile, from_attributes=True)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(profile_id: int, user: CaregiverDep, session: SessionDep) -> None:
    profile = get_accessible_profile(session, user, profile_id, write=True)
    session.delete(profile)
    session.commit()
