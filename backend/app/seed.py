"""Demo data: `uv run python -m app.seed`.

Creates (or resets) the "Sharma Family": a caregiver, 3 member logins linked to profiles,
6 medicines and 7 days of dose history. Needs SUPABASE_SERVICE_ROLE_KEY (to create login users)
and DATABASE_URL.
"""

import os
import random
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import httpx
from sqlmodel import Session, select

from app.config import get_settings
from app.db import engine, init_db
from app.models import (
    AppUser,
    DoseLog,
    DoseStatus,
    Family,
    Medicine,
    Profile,
    Role,
    ScheduleTime,
)

FAMILY = "Sharma Family"
TZ = "Asia/Kolkata"
PASSWORD = os.environ.get("SEED_PASSWORD", "PillPal@2026")

# name, date of birth, notes, login email (None = no login), chance each dose is taken
PEOPLE = [
    ("Ramesh Sharma", date(1953, 3, 14), "Type 2 diabetes. Allergic to sulfa drugs.",
     "ramesh@example.com", None),
    ("Kamala Sharma", date(1957, 8, 2), "Thyroid. Prefers large print.",
     "kamala@example.com", 0.95),
    ("Arjun Sharma", date(2010, 11, 20), "Mild asthma.", "arjun@example.com", 0.85),
]  # fmt: skip
CAREGIVER_EMAIL = "priya@example.com"

# person index, name, strength, instructions, times
MEDICINES = [
    (0, "Metformin", "500 mg Tab", "1 tablet after food", ["08:00", "20:00"]),
    (0, "Amlodipine", "5 mg Tab", "1 tablet in the morning", ["08:30"]),
    (0, "Atorvastatin", "10 mg Tab", "1 tablet at bedtime", ["21:30"]),
    (1, "Levothyroxine", "50 mcg Tab", "1 tablet on an empty stomach", ["06:30"]),
    (1, "Calcium + Vitamin D3", "500 mg Tab", "1 tablet after lunch", ["13:00"]),
    (2, "Montelukast", "10 mg Tab", "1 tablet at night", ["21:00"]),
]


def auth_user_id(client: httpx.Client, email: str) -> str:
    r = client.post(
        "/admin/users", json={"email": email, "password": PASSWORD, "email_confirm": True}
    )
    if r.status_code in (200, 201):
        return r.json()["id"]
    # Already exists: find it (demo project, so one page of users is plenty)
    users = client.get("/admin/users", params={"per_page": 1000}).json()["users"]
    for u in users:
        if u["email"] == email:
            client.put(f"/admin/users/{u['id']}", json={"password": PASSWORD})
            return u["id"]
    r.raise_for_status()
    raise RuntimeError(f"Could not create or find {email}")


def take_chance(person: int, t: time, rng: random.Random) -> bool:
    chance = PEOPLE[person][4]
    if (
        chance is None
    ):  # Ramesh: reliable mornings, often forgets evenings (story for the AI summary)
        chance = 0.95 if t.hour < 12 else 0.55
    return rng.random() < chance


def main() -> None:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise SystemExit("Set SUPABASE_SERVICE_ROLE_KEY in backend/.env first.")
    key = settings.supabase_service_role_key
    client = httpx.Client(
        base_url=f"{settings.supabase_url}/auth/v1",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
        timeout=15,
    )
    init_db()
    rng = random.Random(42)
    now = datetime.now(UTC).astimezone(ZoneInfo(TZ))
    today = now.date()

    with Session(engine) as s:
        for old in s.exec(select(Family).where(Family.name == FAMILY)):
            s.delete(old)  # cascades to everything below
        s.commit()

        fam = Family(name=FAMILY, timezone=TZ)
        s.add(fam)
        s.flush()
        profiles = []
        for name, dob, notes, _, _ in PEOPLE:
            p = Profile(family_id=fam.id, name=name, date_of_birth=dob, notes=notes)
            s.add(p)
            profiles.append(p)
        s.flush()

        caregiver_id = auth_user_id(client, CAREGIVER_EMAIL)
        s.add(
            AppUser(
                id=caregiver_id,
                email=CAREGIVER_EMAIL,
                role=Role.caregiver,
                family_id=fam.id,
            )
        )
        for (_, _, _, email, _), p in zip(PEOPLE, profiles, strict=True):
            s.add(
                AppUser(
                    id=auth_user_id(client, email),
                    email=email,
                    role=Role.member,
                    family_id=fam.id,
                    profile_id=p.id,
                )
            )

        start = today - timedelta(days=7)
        for person, name, strength, instructions, times in MEDICINES:
            med = Medicine(
                profile_id=profiles[person].id,
                name=name,
                strength=strength,
                instructions=instructions,
                start_date=start,
            )
            s.add(med)
            s.flush()
            for hhmm in times:
                t = time.fromisoformat(hhmm)
                s.add(ScheduleTime(medicine_id=med.id, time_of_day=t))
                for offset in range(7, -1, -1):
                    day = today - timedelta(days=offset)
                    # Leave the last 90 minutes (and the future) unmarked for the live demo.
                    if datetime.combine(day, t, tzinfo=now.tzinfo) > now - timedelta(minutes=90):
                        continue
                    if take_chance(person, t, rng):
                        status = DoseStatus.taken
                    elif rng.random() < 0.3:
                        status = DoseStatus.skipped
                    else:
                        continue  # missed = no log
                    s.add(
                        DoseLog(
                            medicine_id=med.id,
                            scheduled_date=day,
                            scheduled_time=t,
                            status=status,
                            marked_at=datetime.combine(day, t, tzinfo=now.tzinfo)
                            + timedelta(minutes=rng.randint(0, 40)),
                            marked_by=caregiver_id,
                        )
                    )
        s.commit()

    print(f"Seeded {FAMILY}. Logins (password {PASSWORD!r}):")
    print(f"  caregiver: {CAREGIVER_EMAIL}")
    for name, _, _, email, _ in PEOPLE:
        print(f"  member:    {email}  ({name})")


if __name__ == "__main__":
    main()
