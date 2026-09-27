from fastapi import APIRouter

from app.auth import SessionDep, UserDep
from app.models import Family
from app.schemas import MeOut

router = APIRouter(tags=["me"])


@router.get("/me")
def me(user: UserDep, session: SessionDep) -> MeOut:
    family = session.get(Family, user.family_id)
    return MeOut(
        id=user.id,
        email=user.email,
        role=user.role,
        family_id=user.family_id,
        family_name=family.name,
        timezone=family.timezone,
        profile_id=user.profile_id,
    )
