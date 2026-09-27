# PillPal Web App Implementation Plan

> Execution: native (implemented in-session, task by task). Steps use checkboxes for tracking.

**Goal:** Working web demo of PillPal — FastAPI REST backend on Supabase Postgres + Astro static frontend.

**Architecture:** FastAPI (SQLModel) owns all data access, validation and role checks; it verifies Supabase Auth
ES256 JWTs via the project JWKS. Astro builds a static site (Preact islands) that calls the API with the user's
access token. Mobile (Capacitor) is deferred, but the frontend stays static so it can be wrapped later.

**Tech Stack:** Python 3.14 + uv, FastAPI, SQLModel, psycopg 3, PyJWT[crypto], httpx, pytest, Ruff ·
Node 22, Astro 5 (static), Preact, supabase-js, Biome · Supabase Postgres + Auth · Groq · NLM RxTerms.

**Spec:** `docs/superpowers/specs/2026-09-27-pillpal-design.md`

## Global Constraints

- Web first; Capacitor/Android deferred (spec §11 constraints still respected: static output, absolute `PUBLIC_API_URL`).
- Backend lint: `ruff check .` and `ruff format --check .` must pass. Frontend: `biome check .` must pass.
- Every commit is pushed to `origin main`.
- Senior-friendly UI (spec §10a): 20 px body, ≥ 7:1 text contrast, ≥ 56 px targets, text labels on icons, 12-hour times.
- Status colours: Taken `#0072B2`, Skipped `#E69F00`, Pending `#56B4E9`, Missed `#D55E00` — tinted bg + border + icon + dark text.
- Dose times are wall-clock in the family's timezone (`Family.timezone`, default `Asia/Kolkata`).
- Secrets only in `.env` (git-ignored); `.env.example` committed.

## Review Focus

1. Dose at a time crossing midnight / "now" in a different timezone than the server → status uses family timezone.
2. Medicine edited after doses were logged (time removed) → old logs still count in adherence, no crash.
3. RxTerms or Groq down/slow → endpoints still return 200 with fallback within timeout.
4. Member hitting another profile's id directly in the URL → 403, not 404 leak of other families' data.
5. Marking the same dose twice quickly → one log row (upsert), status updated.

---

### Task 1: Backend scaffold, config, DB, models
**Files:** `backend/pyproject.toml`, `backend/app/{__init__,config,db,models,main}.py`, `backend/tests/conftest.py`, `backend/.env.example`
**Produces:** `Settings` (`database_url`, `supabase_url`, `cors_origins`, `groq_api_key`, `groq_model`), `get_session()`,
tables `Family, AppUser, Profile, Medicine, ScheduleTime, DoseLog`, `GET /health`.
- [ ] test `/health` returns `{"status":"ok"}` → implement → ruff → commit + push

### Task 2: Auth (Supabase JWT) + `/me` + role guards
**Files:** `backend/app/auth.py`, `backend/app/routers/me.py`, tests
**Produces:** `current_user` dependency → `AppUser`; `require_caregiver`; `ensure_profile_access(user, profile, write)`.
- [ ] tests: missing token 401, unknown user 403, caregiver/member `/me` → implement → commit + push

### Task 3: Profiles CRUD
- [ ] tests: caregiver CRUD, member read-own only, cross-family 403 → implement → commit + push

### Task 4: Medicines CRUD + validation rules 1–4
- [ ] tests: duplicate 409, duplicate time 422, 30-min warning, end<start 422, no times 422 → implement → commit + push

### Task 5: Schedule computation + dose marking (rule 5)
**Produces:** `build_schedule(session, profiles, day, now) -> list[DoseItem]`, `POST /doses/mark` upsert.
- [ ] tests: pending/missed/taken statuses, future dose 422, out-of-range 422, re-mark updates → implement → commit + push

### Task 6: Adherence
- [ ] tests: % taken, counts, per-day series, streak → implement → commit + push

### Task 7: Drug suggest (RxTerms) + missed summary (Groq + rules fallback)
- [ ] tests with httpx mocked: success, upstream failure → `[]`; summary rules fallback when no key → implement → commit + push

### Task 8: Supabase wiring — schema + RLS on Supabase, seed users/data, CI
- [ ] apply schema + enable RLS via migration; seed script (auth admin API + rows); GitHub Actions (ruff + pytest) → commit + push

### Task 9: Frontend scaffold — Astro static, Biome, tokens, layout, login
- [ ] `astro build` passes, `biome check` passes, login works against Supabase → commit + push

### Task 10: Today page (schedule, Taken/Skip, undo, due banner)
### Task 11: Profiles + Medicine form (autocomplete, validation messages, warnings)
### Task 12: Adherence page (ring, 7-day chart, streak, AI summary card)
### Task 13: Browser notifications (permission button, service worker, polling, follow-up)
### Task 14: Polish + accessibility pass (Lighthouse ≥ 95, 200 % text), README with run instructions
Each: build + Biome pass, manual check in browser, commit + push.

---

## Phase 2 (addendum A–C)

### Task 15: Invitations + onboarding backend
Identity dependency (JWT sub + email, no AppUser needed); `Invitation` model + migration + RLS;
`POST /families`, `GET /invitations/mine`, `POST /invitations/{id}/accept|decline`,
caregiver `GET/POST /invitations`, `DELETE /invitations/{id}`. Tests for every rule in addendum A.
### Task 16: Sign-up, Welcome and invite UI
### Task 17: Senior redesign (home per role, plain words, bigger defaults, stepped medicine form, read aloud)
### Task 18: Translation backend (`Translation` cache table, `POST /translate`, summary in language)
### Task 19: Translation frontend (language picker, t(), RTL, instructions original-beneath)
