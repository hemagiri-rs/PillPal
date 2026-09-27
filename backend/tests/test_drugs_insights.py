from datetime import UTC, datetime

import httpx
import pytest

import app.routers.drugs as drugs
import app.routers.insights as insights
from app.config import get_settings
from app.main import app
from app.routers.doses import get_now
from tests.conftest import make_profile

# Real RxTerms response shape (trimmed), captured 2026-09-27 for "metf"
RXTERMS_PAYLOAD = [
    20,
    ["metFORMIN (Oral Pill)", "metFORMIN XR (Oral Pill)"],
    {"STRENGTHS_AND_FORMS": [["  500 mg Tab", "  850 mg Tab"], ["  500 mg 24 HR XR Tab"]]},
    [["metFORMIN (Oral Pill)"], ["metFORMIN XR (Oral Pill)"]],
]


def test_parse_rxterms():
    out = drugs.parse_rxterms(RXTERMS_PAYLOAD)
    assert out[0].name == "metFORMIN (Oral Pill)"
    assert out[0].strengths == ["500 mg Tab", "850 mg Tab"]
    assert len(out) == 2


def test_parse_rxterms_no_results():
    assert drugs.parse_rxterms([0, [], None, []]) == []


def test_suggest_success(client_as, caregiver, monkeypatch):
    monkeypatch.setattr(
        drugs, "fetch_rxterms", lambda q: tuple(drugs.parse_rxterms(RXTERMS_PAYLOAD))
    )
    r = client_as(caregiver).get("/drugs/suggest", params={"q": "Metf"})
    assert r.status_code == 200
    assert r.json()[1]["strengths"] == ["500 mg 24 HR XR Tab"]


def test_suggest_upstream_down_returns_empty(client_as, caregiver, monkeypatch):
    def boom(q):
        raise httpx.ConnectTimeout("down")

    monkeypatch.setattr(drugs, "fetch_rxterms", boom)
    r = client_as(caregiver).get("/drugs/suggest", params={"q": "metf"})
    assert r.status_code == 200
    assert r.json() == []


def test_suggest_needs_two_chars(client_as, caregiver):
    assert client_as(caregiver).get("/drugs/suggest", params={"q": "m"}).status_code == 422


# --- missed summary ---

NOW = datetime(2026, 9, 27, 16, 0, tzinfo=UTC)  # 21:30 IST


@pytest.fixture
def c(client_as, caregiver, grandpa):
    app.dependency_overrides[get_now] = lambda: NOW
    c = client_as(caregiver)
    body = {
        "profile_id": grandpa.id,
        "name": "Metformin",
        "strength": "500 mg",
        "instructions": "1 tablet",
        "start_date": "2026-09-25",
        "times": ["08:00", "20:00"],
    }
    med = c.post("/medicines", json=body).json()["id"]
    for day in ("2026-09-25", "2026-09-26", "2026-09-27"):
        c.post(
            "/doses/mark",
            json={"medicine_id": med, "date": day, "time": "08:00", "status": "taken"},
        )
    return c  # 20:00 doses on all three days are missed


@pytest.fixture
def no_groq_key(monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", None)


def test_summary_rules_fallback_without_key(c, grandpa, no_groq_key):
    r = c.post("/insights/missed-summary", json={"profile_id": grandpa.id})
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "rules"
    f = body["facts"]
    assert (f["doses_due"], f["taken"], f["missed"]) == (6, 3, 3)
    assert f["most_missed_time_of_day"] == "evening"
    assert "Grandpa took 3 of 6 doses (50%)" in body["summary"]
    assert "evening" in body["summary"]


def test_summary_uses_groq_when_available(c, grandpa, monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", "test-key")
    sent = {}

    def fake(facts):
        sent.update(facts)
        return "Grandpa usually remembers his morning Metformin."

    monkeypatch.setattr(insights, "groq_summary", fake)
    body = c.post("/insights/missed-summary", json={"profile_id": grandpa.id}).json()
    assert body == body | {
        "source": "ai",
        "summary": "Grandpa usually remembers his morning Metformin.",
    }
    # Privacy: no DOB, notes, email or ids are sent to the AI
    assert set(sent) == {
        "first_name", "period", "doses_due", "taken", "missed", "skipped", "percent_taken",
        "not_taken_by_medicine", "most_missed_time_of_day", "most_missed_weekday",
        "current_streak_days",
    }  # fmt: skip


def test_summary_falls_back_when_groq_fails(c, grandpa, monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", "test-key")

    def boom(facts):
        raise httpx.ReadTimeout("slow")

    monkeypatch.setattr(insights, "groq_summary", boom)
    body = c.post("/insights/missed-summary", json={"profile_id": grandpa.id}).json()
    assert body["source"] == "rules"


def test_summary_member_cannot_see_others(client_as, member, c, session, family):
    nani = make_profile(session, family, "Nani")
    r = client_as(member).post("/insights/missed-summary", json={"profile_id": nani.id})
    assert r.status_code == 403
