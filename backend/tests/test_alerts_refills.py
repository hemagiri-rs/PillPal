from datetime import UTC, datetime

import pytest

from app.main import app
from app.routers.doses import get_now

NOW = datetime(2026, 9, 27, 16, 0, tzinfo=UTC)  # 21:30 IST


@pytest.fixture
def c(client_as, caregiver):
    app.dependency_overrides[get_now] = lambda: NOW
    return client_as(caregiver)


def add(c, profile_id, **over):
    body = {
        "profile_id": profile_id,
        "name": "Metformin",
        "strength": "500 mg",
        "instructions": "1 tablet",
        "start_date": "2026-09-25",
        "times": ["08:00", "20:00"],
    } | over
    r = c.post("/medicines", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def mark(c, mid, day, time, status):
    body = {"medicine_id": mid, "date": day, "time": time, "status": status}
    return c.post("/doses/mark", json=body)


def test_stock_goes_down_when_taken_and_back_on_undo(c, grandpa):
    med = add(c, grandpa.id, pills_left=20, pills_per_dose=2)
    assert med["days_left"] == 5  # 20 / (2 per dose * 2 doses a day)
    mark(c, med["id"], "2026-09-27", "08:00", "taken")
    assert c.get(f"/medicines/{med['id']}").json()["pills_left"] == 18
    mark(c, med["id"], "2026-09-27", "08:00", "taken")  # re-marking doesn't count twice
    assert c.get(f"/medicines/{med['id']}").json()["pills_left"] == 18
    mark(c, med["id"], "2026-09-27", "08:00", "skipped")  # changed mind: tablets back
    assert c.get(f"/medicines/{med['id']}").json()["pills_left"] == 20
    mark(c, med["id"], "2026-09-27", "08:00", "taken")
    mark(c, med["id"], "2026-09-27", "08:00", "pending")  # undo
    assert c.get(f"/medicines/{med['id']}").json()["pills_left"] == 20


def test_stock_never_negative_and_untracked_is_ignored(c, grandpa):
    med = add(c, grandpa.id, pills_left=1)
    mark(c, med["id"], "2026-09-26", "08:00", "taken")
    mark(c, med["id"], "2026-09-26", "20:00", "taken")
    assert c.get(f"/medicines/{med['id']}").json()["pills_left"] == 0
    plain = add(c, grandpa.id, name="Aspirin", times=["13:00"])
    assert plain["pills_left"] is None and plain["days_left"] is None


def test_refill_by_patch_and_invalid_stock(c, grandpa):
    med = add(c, grandpa.id, pills_left=2)
    r = c.patch(f"/medicines/{med['id']}", json={"pills_left": 60})
    assert (r.json()["pills_left"], r.json()["days_left"]) == (60, 30)
    assert c.patch(f"/medicines/{med['id']}", json={"pills_left": -1}).status_code == 422
    assert c.patch(f"/medicines/{med['id']}", json={"pills_per_dose": 0}).status_code == 422


def test_alerts_low_adherence_and_refills(c, session, family, grandpa):
    from tests.conftest import make_profile

    nani = make_profile(session, family, "Nani")
    g = add(c, grandpa.id, pills_left=6)  # 3 days at 2/day -> refill alert
    n = add(c, nani.id, name="Calcium", times=["08:00"], pills_left=100)
    for day in ("2026-09-25", "2026-09-26", "2026-09-27"):
        mark(c, n["id"], day, "08:00", "taken")  # Nani 100%
    mark(c, g["id"], "2026-09-27", "08:00", "taken")  # Grandpa 1 of 6 due

    body = c.get("/alerts").json()
    assert [(a["name"], a["percent"]) for a in body["low_adherence"]] == [("Grandpa", 17)]
    assert [(r["name"], r["days_left"]) for r in body["refills"]] == [("Metformin", 2)]


def test_member_alerts_only_own(client_as, member, c, session, family, grandpa):
    from tests.conftest import make_profile

    nani = make_profile(session, family, "Nani")
    add(c, nani.id, name="Calcium", times=["08:00"], pills_left=1)
    add(c, grandpa.id, pills_left=1)
    body = client_as(member).get("/alerts").json()
    assert {r["profile_name"] for r in body["refills"]} == {"Grandpa"}
