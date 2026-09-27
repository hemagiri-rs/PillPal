import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel

import app.models
from app.auth import current_user
from app.db import get_session, make_engine
from app.main import app
from app.models import AppUser, Family, Profile, Role


@pytest.fixture
def session():
    engine = make_engine("sqlite://", poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


@pytest.fixture
def family(session) -> Family:
    fam = Family(name="Sharma", timezone="Asia/Kolkata")
    session.add(fam)
    session.commit()
    session.refresh(fam)
    return fam


def make_user(session, family, role: Role, profile: Profile | None = None) -> AppUser:
    user = AppUser(
        id=uuid.uuid4(),
        email=f"{uuid.uuid4().hex[:8]}@example.com",
        role=role,
        family_id=family.id,
        profile_id=profile.id if profile else None,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def make_profile(session, family, name="Grandpa") -> Profile:
    profile = Profile(family_id=family.id, name=name)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


@pytest.fixture
def caregiver(session, family) -> AppUser:
    return make_user(session, family, Role.caregiver)


@pytest.fixture
def grandpa(session, family) -> Profile:
    return make_profile(session, family, "Grandpa")


@pytest.fixture
def member(session, family, grandpa) -> AppUser:
    return make_user(session, family, Role.member, grandpa)


@pytest.fixture
def client_as(session):
    """client_as(user) -> TestClient acting as that user (None = unauthenticated)."""
    app.dependency_overrides[get_session] = lambda: session

    def _client(user: AppUser | None) -> TestClient:
        if user is None:
            app.dependency_overrides.pop(current_user, None)
        else:
            app.dependency_overrides[current_user] = lambda: user
        return TestClient(app)

    yield _client
    app.dependency_overrides.clear()
