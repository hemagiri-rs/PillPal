import json

import httpx
import pytest

import app.routers.translate as tr
from app.models import Translation


@pytest.fixture
def fake_groq(monkeypatch):
    calls = []

    def fake(system, user, **kw):
        texts = json.loads(user)
        calls.append(texts)
        return json.dumps({k: f"[hi] {v}" for k, v in texts.items()})

    monkeypatch.setattr(tr, "groq_chat", fake)
    return calls


def test_signed_in_translates_and_caches(client_as, caregiver, session, fake_groq):
    c = client_as(caregiver)
    body = {"lang": "hi", "texts": ["I took it", "Home", "I took it"]}
    r = c.post("/translate", json=body)
    assert r.status_code == 200
    assert r.json()["translations"] == {"I took it": "[hi] I took it", "Home": "[hi] Home"}
    assert len(fake_groq) == 1
    # Second time: served from the database, no Groq call
    c.post("/translate", json=body)
    assert len(fake_groq) == 1
    assert session.query(Translation).count() == 2


def test_signed_out_gets_cache_only(client_as, session, fake_groq):
    session.add(Translation(lang="ta", source="Sign in", text="உள்நுழைக"))
    session.commit()
    r = client_as(None).post("/translate", json={"lang": "ta", "texts": ["Sign in", "Email"]})
    assert r.json()["translations"] == {"Sign in": "உள்நுழைக", "Email": "Email"}
    assert fake_groq == []  # never calls Groq for anonymous users


def test_groq_failure_falls_back_to_english(client_as, caregiver, monkeypatch):
    def boom(*a, **k):
        raise httpx.ConnectTimeout("down")

    monkeypatch.setattr(tr, "groq_chat", boom)
    r = client_as(caregiver).post("/translate", json={"lang": "bn", "texts": ["Home"]})
    assert r.json()["translations"] == {"Home": "Home"}


def test_english_and_unknown_language(client_as, caregiver, fake_groq):
    c = client_as(caregiver)
    assert c.post("/translate", json={"lang": "en", "texts": ["Home"]}).json()["translations"] == {
        "Home": "Home"
    }
    assert c.post("/translate", json={"lang": "xx", "texts": ["Home"]}).status_code == 422
    assert fake_groq == []


def test_ignores_bad_ids_from_model(client_as, caregiver, monkeypatch):
    monkeypatch.setattr(tr, "groq_chat", lambda *a, **k: '{"0": "घर", "7": "junk", "x": 1}')
    r = client_as(caregiver).post("/translate", json={"lang": "hi", "texts": ["Home", "Back"]})
    assert r.json()["translations"] == {"Home": "घर", "Back": "Back"}
