import pytest

from tests.conftest import make_profile


def med(profile_id, **over):
    body = {
        "profile_id": profile_id,
        "name": "Metformin",
        "strength": "500 mg Tab",
        "instructions": "1 tablet after food",
        "start_date": "2026-09-01",
        "times": ["08:00", "20:00"],
    }
    return body | over


@pytest.fixture
def c(client_as, caregiver):
    return client_as(caregiver)


def test_create_and_read(c, grandpa):
    r = c.post("/medicines", json=med(grandpa.id, times=["20:00", "08:00"]))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["times"] == ["08:00:00", "20:00:00"]
    assert body["warnings"] == []
    assert c.get(f"/medicines?profile_id={grandpa.id}").json()[0]["name"] == "Metformin"


def test_duplicate_medicine_is_409(c, grandpa):
    assert c.post("/medicines", json=med(grandpa.id)).status_code == 201
    r = c.post("/medicines", json=med(grandpa.id, name="  metformin ", strength="500 MG tab"))
    assert r.status_code == 409
    assert "already added for Grandpa from 1 Sep 2026" in r.json()["detail"]


def test_same_medicine_non_overlapping_dates_ok(c, grandpa):
    c.post("/medicines", json=med(grandpa.id, end_date="2026-09-10"))
    r = c.post("/medicines", json=med(grandpa.id, start_date="2026-09-11"))
    assert r.status_code == 201


def test_same_medicine_other_person_ok(c, session, family, grandpa):
    nani = make_profile(session, family, "Nani")
    c.post("/medicines", json=med(grandpa.id))
    assert c.post("/medicines", json=med(nani.id)).status_code == 201


def test_duplicate_time_is_422(c, grandpa):
    r = c.post("/medicines", json=med(grandpa.id, times=["08:00", "08:00"]))
    assert r.status_code == 422
    assert "same time is listed twice" in r.text


@pytest.mark.parametrize(
    "over",
    [
        {"times": []},
        {"end_date": "2026-08-01"},
        {"name": "   "},
        {"instructions": ""},
    ],
)
def test_invalid_fields_are_422(c, grandpa, over):
    assert c.post("/medicines", json=med(grandpa.id, **over)).status_code == 422


def test_timing_conflict_warns_but_saves(c, grandpa):
    c.post("/medicines", json=med(grandpa.id, name="Aspirin", strength="75 mg", times=["08:20"]))
    r = c.post("/medicines", json=med(grandpa.id))
    assert r.status_code == 201
    assert r.json()["warnings"] == [
        "Aspirin is also due at 8:20 AM, within 30 minutes of this medicine."
    ]


def test_conflict_across_midnight(c, grandpa):
    c.post("/medicines", json=med(grandpa.id, name="A", times=["23:50"]))
    r = c.post("/medicines", json=med(grandpa.id, name="B", times=["00:10"]))
    assert len(r.json()["warnings"]) == 1


def test_update_rechecks_rules_and_excludes_self(c, grandpa):
    mid = c.post("/medicines", json=med(grandpa.id)).json()["id"]
    # Editing itself must not trip the duplicate check
    r = c.patch(f"/medicines/{mid}", json={"instructions": "1 tablet after dinner"})
    assert r.status_code == 200
    assert r.json()["times"] == ["08:00:00", "20:00:00"]

    other = c.post("/medicines", json=med(grandpa.id, name="Aspirin", times=["13:00"])).json()
    r = c.patch(f"/medicines/{other['id']}", json={"name": "Metformin", "strength": "500 mg Tab"})
    assert r.status_code == 409
    r = c.patch(f"/medicines/{mid}", json={"end_date": "2026-01-01"})
    assert r.status_code == 422


def test_inactive_medicine_is_not_a_duplicate(c, grandpa):
    mid = c.post("/medicines", json=med(grandpa.id)).json()["id"]
    c.patch(f"/medicines/{mid}", json={"active": False})
    assert c.post("/medicines", json=med(grandpa.id)).status_code == 201


def test_member_read_only_own(client_as, session, family, member, grandpa, c):
    nani = make_profile(session, family, "Nani")
    mine = c.post("/medicines", json=med(grandpa.id)).json()["id"]
    theirs = c.post("/medicines", json=med(nani.id)).json()["id"]
    m = client_as(member)
    assert [x["id"] for x in m.get("/medicines").json()] == [mine]
    assert m.get(f"/medicines/{theirs}").status_code == 403
    assert m.post("/medicines", json=med(grandpa.id, name="X")).status_code == 403
    assert m.delete(f"/medicines/{mine}").status_code == 403


def test_delete(c, grandpa):
    mid = c.post("/medicines", json=med(grandpa.id)).json()["id"]
    assert c.delete(f"/medicines/{mid}").status_code == 204
    assert c.get(f"/medicines/{mid}").status_code == 404
