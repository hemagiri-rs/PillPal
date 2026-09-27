import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

import app.auth as auth


def test_health(client_as):
    assert client_as(None).get("/health").json() == {"status": "ok"}


def test_missing_token_is_401(client_as):
    r = client_as(None).get("/me")
    assert r.status_code == 401


@pytest.fixture
def signing_key(monkeypatch):
    """Replace the Supabase JWKS lookup with a local EC key."""
    key = ec.generate_private_key(ec.SECP256R1())

    class FakeJwk:
        def get_signing_key_from_jwt(self, _token):
            return type("K", (), {"key": key.public_key()})()

    monkeypatch.setattr(auth, "jwks_client", lambda: FakeJwk())
    return key


def token(key, sub, **overrides):
    claims = {
        "sub": str(sub),
        "aud": "authenticated",
        "exp": datetime.now(UTC) + timedelta(hours=1),
        **overrides,
    }
    return jwt.encode(claims, key, algorithm="ES256")


def test_valid_token_returns_me(client_as, caregiver, signing_key):
    r = client_as(None).get(
        "/me", headers={"Authorization": f"Bearer {token(signing_key, caregiver.id)}"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "caregiver"
    assert body["family_name"] == "Sharma"
    assert body["timezone"] == "Asia/Kolkata"


def test_expired_token_is_401(client_as, caregiver, signing_key):
    expired = token(signing_key, caregiver.id, exp=datetime.now(UTC) - timedelta(minutes=1))
    r = client_as(None).get("/me", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401


def test_token_signed_by_other_key_is_401(client_as, caregiver, signing_key):
    other = ec.generate_private_key(ec.SECP256R1())
    r = client_as(None).get(
        "/me", headers={"Authorization": f"Bearer {token(other, caregiver.id)}"}
    )
    assert r.status_code == 401


def test_unknown_user_is_403(client_as, signing_key):
    r = client_as(None).get(
        "/me", headers={"Authorization": f"Bearer {token(signing_key, uuid.uuid4())}"}
    )
    assert r.status_code == 403


def test_member_me_has_profile(client_as, member, grandpa):
    body = client_as(member).get("/me").json()
    assert body["role"] == "member"
    assert body["profile_id"] == grandpa.id
