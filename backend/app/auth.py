"""Supabase Auth JWT verification and role/ownership guards."""

import uuid
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.config import get_settings
from app.db import get_session
from app.models import AppUser, Profile, Role

bearer = HTTPBearer(auto_error=False)
SessionDep = Annotated[Session, Depends(get_session)]


@lru_cache
def jwks_client() -> jwt.PyJWKClient:
    url = f"{get_settings().supabase_url}/auth/v1/.well-known/jwks.json"
    return jwt.PyJWKClient(url, cache_keys=True)


def decode_token(token: str) -> dict:
    key = jwks_client().get_signing_key_from_jwt(token).key
    return jwt.decode(token, key, algorithms=["ES256", "RS256"], audience="authenticated")


def current_user(
    session: SessionDep,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> AppUser:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in.")
    try:
        claims = decode_token(creds.credentials)
        user_id = uuid.UUID(claims["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Your session has expired. Please sign in again."
        ) from exc
    user = session.get(AppUser, user_id)
    if user is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not set up in PillPal.")
    return user


UserDep = Annotated[AppUser, Depends(current_user)]


def require_caregiver(user: UserDep) -> AppUser:
    if user.role != Role.caregiver:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the caregiver can do this.")
    return user


CaregiverDep = Annotated[AppUser, Depends(require_caregiver)]


def get_accessible_profile(
    session: Session, user: AppUser, profile_id: int, *, write: bool = False
) -> Profile:
    """Load a profile the user may see (write=True: may edit). Raises 404/403."""
    profile = session.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found.")
    if profile.family_id != user.family_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You don't have access to this profile.")
    if user.role == Role.member and (write or profile.id != user.profile_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You don't have access to this profile.")
    return profile
