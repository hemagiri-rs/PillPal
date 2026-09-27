from datetime import UTC, datetime

import pytest

from app.main import app
from app.routers.doses import get_now
from tests.conftest import make_profile

# 2026-09-27 21:30 in Asia/Kolkata
NOW = datetime(2026, 9, 27, 16, 0, tzinfo=UTC)


@pytest.fixture
def c(client_as, caregiver):
    app.dependency_overrides[get_now] = lambda: NOW
    return client_as(caregiver)


@pytest.fixture
def med_id(c, grandpa):
    body = {
        "profile_id": grandpa.id,
        "name": "Metformin",
        "strength": "500 mg",
        "instructions": "1 tablet",
        "start_date": "2026-09-25",
        "times": ["08:00", "20:00"],
    }
    return c.post("/medicines", json=body).json()["id"]


def mark(c, med_id, day, time, status="taken"):
    r = c.post(
        "/doses/mark",
        json={"medicine_id": med_id, "date": day, "time": time, "status": status},
    )
    assert r.status_code == 200, r.text


def test_adherence_counts_percent_and_days(c, med_id):
    # 25th: both taken. 26th: one taken, one skipped. 27th: 08:00 taken, 20:00 missed (21:30 now)
    mark(c, med_id, "2026-09-25", "08:00")
    mark(c, med_id, "2026-09-25", "20:00")
    mark(c, med_id, "2026-09-26", "08:00")
    mark(c, med_id, "2026-09-26", "20:00", "skipped")
    mark(c, med_id, "2026-09-27", "08:00")

    body = c.get("/adherence").json()
    assert body["start"] == "2026-09-21"
    assert body["end"] == "2026-09-27"
    assert body["overall"] == {"taken": 4, "skipped": 1, "missed": 1, "pending": 0, "percent": 67}
    days = {d["date"]: d for d in body["days"]}
    assert days["2026-09-24"]["percent"] is None  # before the medicine started
    assert days["2026-09-25"]["percent"] == 100
    assert days["2026-09-26"]["skipped"] == 1
    assert body["medicines"][0]["name"] == "Metformin"
    assert body["streak_days"] == 0  # today has a missed dose


def test_streak_counts_fully_taken_days(c, med_id):
    for day in ("2026-09-26", "2026-09-27"):
        mark(c, med_id, day, "08:00")
        mark(c, med_id, day, "20:00")
    mark(c, med_id, "2026-09-25", "08:00")  # 25th 20:00 missed -> breaks there
    assert c.get("/adherence").json()["streak_days"] == 2


def test_nothing_due_gives_null_percent(c, grandpa):
    body = c.get("/adherence").json()
    assert body["overall"]["percent"] is None
    assert body["streak_days"] == 0


def test_bad_ranges_are_422(c):
    assert c.get("/adherence", params={"from": "2026-09-27", "to": "2026-09-01"}).status_code == 422
    assert c.get("/adherence", params={"from": "2026-01-01", "to": "2026-09-01"}).status_code == 422


def test_member_limited_to_own(client_as, member, c, med_id, session, family):
    nani = make_profile(session, family, "Nani")
    m = client_as(member)
    assert m.get("/adherence").status_code == 200
    assert m.get("/adherence", params={"profile_id": nani.id}).status_code == 403
