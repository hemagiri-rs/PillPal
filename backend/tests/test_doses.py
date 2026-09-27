from datetime import UTC, datetime

import pytest

from app.main import app
from app.routers.doses import get_now
from tests.conftest import make_profile

# 2026-09-27 10:00 in Asia/Kolkata (UTC+5:30)
NOW = datetime(2026, 9, 27, 4, 30, tzinfo=UTC)


@pytest.fixture
def c(client_as, caregiver):
    app.dependency_overrides[get_now] = lambda: NOW
    return client_as(caregiver)


@pytest.fixture
def metformin(c, grandpa):
    body = {
        "profile_id": grandpa.id,
        "name": "Metformin",
        "strength": "500 mg",
        "instructions": "1 tablet after food",
        "start_date": "2026-09-25",
        "times": ["08:00", "09:30", "20:00"],
    }
    return c.post("/medicines", json=body).json()["id"]


def statuses(c, **params):
    doses = c.get("/schedule", params=params).json()["doses"]
    return [(d["time"][:5], d["status"], d["due"]) for d in doses]


def mark(c, med_id, time, status, date="2026-09-27"):
    return c.post(
        "/doses/mark", json={"medicine_id": med_id, "date": date, "time": time, "status": status}
    )


def test_today_statuses_use_family_timezone(c, metformin):
    # 08:00 is >1h past -> missed; 09:30 is 30 min past -> pending + due; 20:00 -> pending
    assert statuses(c) == [
        ("08:00", "missed", False),
        ("09:30", "pending", True),
        ("20:00", "pending", False),
    ]
    assert c.get("/schedule").json()["date"] == "2026-09-27"


def test_before_start_date_is_empty(c, metformin):
    assert statuses(c, date="2026-09-24") == []


def test_mark_taken_skip_and_undo(c, metformin):
    r = mark(c, metformin, "08:00", "taken")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "taken"
    assert r.json()["marked_at"] is not None

    # Re-marking updates the same dose instead of adding a second one
    assert mark(c, metformin, "08:00", "skipped").json()["status"] == "skipped"
    assert [s for s in statuses(c) if s[0] == "08:00"] == [("08:00", "skipped", False)]

    # Undo -> back to computed status
    assert mark(c, metformin, "08:00", "pending").json()["status"] == "missed"


def test_can_mark_up_to_one_hour_early(c, metformin):
    c.patch(f"/medicines/{metformin}", json={"times": ["08:00", "10:45", "20:00"]})
    assert mark(c, metformin, "10:45", "taken").status_code == 200


def test_future_dose_is_422(c, metformin):
    r = mark(c, metformin, "20:00", "taken")
    assert r.status_code == 422
    assert "not due until 8:00 PM" in r.json()["detail"]
    assert mark(c, metformin, "08:00", "taken", date="2026-09-28").status_code == 422


def test_outside_date_range_or_unscheduled_time_is_422(c, metformin):
    assert mark(c, metformin, "08:00", "taken", date="2026-09-20").status_code == 422
    r = mark(c, metformin, "07:00", "taken")
    assert r.status_code == 422
    assert "not scheduled at 7:00 AM" in r.json()["detail"]


def test_log_kept_after_time_removed(c, metformin):
    mark(c, metformin, "08:00", "taken")
    c.patch(f"/medicines/{metformin}", json={"times": ["09:30", "20:00"]})
    assert ("08:00", "taken", False) in statuses(c)
    assert ("08:00", "taken", False) not in statuses(c, date="2026-09-28")


def test_member_marks_only_own(client_as, session, family, member, grandpa, c, metformin):
    nani = make_profile(session, family, "Nani")
    body = {
        "profile_id": nani.id,
        "name": "Aspirin",
        "strength": "75 mg",
        "instructions": "1 tablet",
        "start_date": "2026-09-25",
        "times": ["08:00"],
    }
    nani_med = c.post("/medicines", json=body).json()["id"]
    m = client_as(member)
    assert mark(m, metformin, "08:00", "taken").status_code == 200
    assert mark(m, nani_med, "08:00", "taken").status_code == 403
    assert {d["profile_name"] for d in m.get("/schedule").json()["doses"]} == {"Grandpa"}
    assert m.get("/schedule", params={"profile_id": nani.id}).status_code == 403


def test_caregiver_sees_whole_family(c, session, family, metformin):
    make_profile(session, family, "Nani")
    assert {d["profile_name"] for d in c.get("/schedule").json()["doses"]} == {"Grandpa"}
