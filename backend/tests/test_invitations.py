import uuid

import pytest

from app.auth import Identity
from app.models import AppUser, Family, Invitation, InviteStatus, Role
from tests.conftest import make_user


def newcomer(email="ramesh@example.com") -> Identity:
    return Identity(id=uuid.uuid4(), email=email)


# ---------- start a family ----------


def test_start_family_makes_caregiver_with_own_profile(client_as, session):
    me = newcomer("priya@example.com")
    r = client_as(me).post(
        "/families",
        json={
            "family_name": " Sharma  Family ",
            "name": "Priya Sharma",
            "timezone": "Asia/Kolkata",
        },
    )
    assert r.status_code == 201, r.text
    user = session.get(AppUser, me.id)
    assert user.role == Role.caregiver
    assert user.profile_id == r.json()["profile_id"]
    assert session.get(Family, user.family_id).name == "Sharma Family"


def test_cannot_start_second_family(client_as, caregiver):
    r = client_as(caregiver).post("/families", json={"family_name": "X", "name": "Y"})
    assert r.status_code == 409


def test_start_family_rejects_bad_timezone(client_as):
    r = client_as(newcomer()).post(
        "/families", json={"family_name": "X", "name": "Y", "timezone": "Mars/Base"}
    )
    assert r.status_code == 422


# ---------- caregiver invites ----------


@pytest.fixture
def cg(client_as, caregiver):
    return client_as(caregiver)


def test_invite_and_list(cg):
    r = cg.post("/invitations", json={"email": "Ramesh@Example.com", "label": "Grandpa"})
    assert r.status_code == 201, r.text
    assert r.json() | {"id": 0} == {
        "id": 0,
        "email": "ramesh@example.com",
        "label": "Grandpa",
        "status": "pending",
    }
    assert [i["email"] for i in cg.get("/invitations").json()] == ["ramesh@example.com"]


def test_invite_rules(cg, caregiver, session, family, grandpa):
    assert cg.post("/invitations", json={"email": "not-an-email"}).status_code == 422
    assert cg.post("/invitations", json={"email": caregiver.email}).status_code == 409
    existing = make_user(session, family, Role.member, grandpa)
    assert cg.post("/invitations", json={"email": existing.email}).status_code == 409
    assert cg.post("/invitations", json={"email": "a@example.com"}).status_code == 201
    r = cg.post("/invitations", json={"email": "a@example.com"})
    assert r.status_code == 409
    assert "already been invited" in r.json()["detail"]


def test_member_cannot_invite(client_as, member):
    assert (
        client_as(member).post("/invitations", json={"email": "x@example.com"}).status_code == 403
    )


def test_cancel_pending_invite(cg):
    iid = cg.post("/invitations", json={"email": "a@example.com"}).json()["id"]
    assert cg.delete(f"/invitations/{iid}").status_code == 204
    assert cg.get("/invitations").json() == []


# ---------- invitee ----------


def test_invitee_sees_and_accepts(client_as, cg, session, caregiver):
    iid = cg.post("/invitations", json={"email": "ramesh@example.com", "label": "Grandpa"}).json()[
        "id"
    ]
    ramesh = newcomer("ramesh@example.com")
    c = client_as(ramesh)
    mine = c.get("/invitations/mine").json()
    assert mine == [
        {"id": iid, "family_name": "Sharma", "invited_by_name": caregiver.email, "label": "Grandpa"}
    ]

    r = c.post(f"/invitations/{iid}/accept", json={"name": "Ramesh Sharma"})
    assert r.status_code == 200, r.text
    user = session.get(AppUser, ramesh.id)
    assert (user.role, user.family_id) == (Role.member, caregiver.family_id)
    # Now visible to the caregiver, with status accepted
    assert "Ramesh Sharma" in [p["name"] for p in cg.get("/profiles").json()]
    assert cg.get("/invitations").json()[0]["status"] == "accepted"
    # Can't answer twice
    assert c.post(f"/invitations/{iid}/decline").status_code == 409


def test_profile_only_exists_after_accept(client_as, cg):
    cg.post("/invitations", json={"email": "ramesh@example.com"})
    names_before = [p["name"] for p in cg.get("/profiles").json()]
    assert "Ramesh Sharma" not in names_before


def test_decline_then_reinvite(client_as, cg):
    iid = cg.post("/invitations", json={"email": "ramesh@example.com"}).json()["id"]
    c = client_as(newcomer("ramesh@example.com"))
    assert c.post(f"/invitations/{iid}/decline").json()["status"] == "declined"
    assert c.get("/invitations/mine").json() == []
    assert cg.get("/invitations").json()[0]["status"] == "declined"
    # Caregiver can invite again; it goes back to pending
    r = cg.post("/invitations", json={"email": "ramesh@example.com"})
    assert (r.status_code, r.json()["status"], r.json()["id"]) == (201, "pending", iid)


def test_only_matching_email_can_answer(client_as, cg):
    iid = cg.post("/invitations", json={"email": "ramesh@example.com"}).json()["id"]
    stranger = client_as(newcomer("someone@example.com"))
    assert stranger.post(f"/invitations/{iid}/accept", json={"name": "X"}).status_code == 404
    assert stranger.post(f"/invitations/{iid}/decline").status_code == 404


def test_member_can_switch_family(client_as, cg, session):
    other = Family(name="Other")
    session.add(other)
    session.commit()
    from tests.conftest import make_profile

    old_profile = make_profile(session, other, "Meena")
    meena = make_user(session, other, Role.member, old_profile)
    iid = cg.post("/invitations", json={"email": meena.email}).json()["id"]
    assert [i["id"] for i in client_as(meena).get("/invitations/mine").json()] == [iid]
    r = client_as(meena).post(f"/invitations/{iid}/accept", json={"name": "Meena S"})
    assert r.status_code == 200, r.text
    session.refresh(meena)
    assert meena.family_id != other.id
    assert session.get(type(old_profile), old_profile.id) is not None  # old profile kept


def test_caregiver_cannot_accept_invite(client_as, cg, session):
    other = Family(name="Other")
    session.add(other)
    session.commit()
    already = make_user(session, other, Role.caregiver)
    iid = cg.post("/invitations", json={"email": already.email}).json()["id"]
    r = client_as(already).post(f"/invitations/{iid}/accept", json={"name": "X"})
    assert r.status_code == 409
    assert session.get(Invitation, iid).status == InviteStatus.pending


def test_not_onboarded_user_gets_403_on_me(client_as):
    r = client_as(newcomer()).get("/me")
    assert r.status_code == 403
