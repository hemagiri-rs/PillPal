from app.models import Family, Role
from tests.conftest import make_profile, make_user


def test_caregiver_crud(client_as, caregiver):
    c = client_as(caregiver)
    r = c.post("/profiles", json={"name": "Grandma", "notes": "Allergic to penicillin"})
    assert r.status_code == 201
    pid = r.json()["id"]

    assert c.patch(f"/profiles/{pid}", json={"name": "Nani"}).json()["name"] == "Nani"
    assert [p["name"] for p in c.get("/profiles").json()] == ["Nani"]
    assert c.delete(f"/profiles/{pid}").status_code == 204
    assert c.get(f"/profiles/{pid}").status_code == 404


def test_blank_name_rejected(client_as, caregiver):
    assert client_as(caregiver).post("/profiles", json={"name": ""}).status_code == 422


def test_member_sees_only_own_profile(client_as, session, family, member, grandpa):
    other = make_profile(session, family, "Aunt")
    c = client_as(member)
    assert [p["id"] for p in c.get("/profiles").json()] == [grandpa.id]
    assert c.get(f"/profiles/{grandpa.id}").status_code == 200
    assert c.get(f"/profiles/{other.id}").status_code == 403


def test_member_cannot_write(client_as, member, grandpa):
    c = client_as(member)
    assert c.post("/profiles", json={"name": "X"}).status_code == 403
    assert c.patch(f"/profiles/{grandpa.id}", json={"name": "X"}).status_code == 403
    assert c.delete(f"/profiles/{grandpa.id}").status_code == 403


def test_other_family_is_forbidden(client_as, session, caregiver):
    other_family = Family(name="Other")
    session.add(other_family)
    session.commit()
    stranger = make_profile(session, other_family, "Stranger")
    other_cg = make_user(session, other_family, Role.caregiver)

    assert client_as(caregiver).get(f"/profiles/{stranger.id}").status_code == 403
    assert client_as(caregiver).delete(f"/profiles/{stranger.id}").status_code == 403
    assert client_as(other_cg).get("/profiles").json()[0]["name"] == "Stranger"
