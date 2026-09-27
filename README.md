# PillPal — Medicine Reminders for the Whole Family

A family medicine-reminder web app built for older people **first**: giant "I took it" buttons, 23 Indian
languages, caregivers invite family by email, and the app warns you before a medicine runs out.

Built for **Vision2Web — Full Stack Web Development Hackathon**, Theme 4 (Health, Wellness & Lifestyle),
problem 2: *Medicine Reminder & Family Schedule*.

> For reminders only — **not medical advice.**

---

## What it does

Caregivers manage the family's medicines and schedules; each family member sees only their own doses and
marks them in one tap. The backend computes the day's schedule, tracks adherence, and flags what needs
attention.

- **Caregiver** — CRUD profiles and medicines for the family, see everyone's day, mark any family dose,
  invite by email, request AI summaries.
- **Member** — see only their own schedule and adherence, mark only their own doses.

## Feature highlights

**Reminders & schedules**
- Daily schedule computed from active medicines × schedule times, merged with what was already marked.
- In-app "due now" banner and badge; browser notifications via a service worker; follow-up reminder for a
  dose still pending 15 minutes later.
- 12-hour times ("8:00 PM"), plain-language dates ("Today", "Mon 28 Sep").
- Forgiving actions: marking a dose shows a large confirmation with a visible **Undo**, instead of
  "are you sure?" dialogs.

**Adherence**
- Taken / skipped / missed / pending counts, a percentage (which excludes doses that aren't due yet),
  a 7-day stacked bar chart in status colours, a current streak, and a per-medicine breakdown.
- History survives edits: a removed schedule time still counts doses that were already logged.

**Family & invitations**
- Caregiver invites by email (invited / joined / said no), cancels a pending invite, re-invites after a
  decline. No emails are sent — invitations are in-app only.
- An invited person accepts (enters name + optional date of birth, which creates their profile and login)
  or declines. A profile — and therefore reminders — exists only after accepting.
- "Add a person without a phone" keeps caregiver-managed profiles for people who don't want an account.

**It notices before you do**
- **Alerts**: family members below 80% adherence this week, and medicines whose remaining tablets last
  5 days or fewer.
- **AI weekly summary**: the backend computes the facts first (missed per medicine, times of day most
  often missed, weekday patterns, streak), then Groq turns them into a short, friendly summary with one
  practical tip. **Falls back to a rule-based summary** if there's no API key or the call fails, so the
  feature always works in a demo.

**Languages**
- English plus the **22 scheduled languages of India** (23 total), with right-to-left layout for Urdu,
  Kashmiri and Sindhi.
- UI strings are English at source and translated live through the backend (database cache first, then
  Groq, batched); the browser caches them too. Groq failure falls back to English.
- Medicine **names are never translated**; instructions are translated with the English original shown
  beneath. The AI summary is generated in the chosen language.
- Read-aloud button (Web Speech API) on dose cards where the device has a voice.
- Known limit: weaker model quality for Bodo, Santali, Dogri and Manipuri — needs native review before
  real-world use.

**Other**
- Drug-name autocomplete from the **NLM RxTerms** API (free, no key), with the available strengths/forms
  per drug — free text is always allowed, so a missing drug database never blocks the user.
- Printable weekly A4 chart (tick boxes) for the fridge or pharmacist.
- Installable (web app manifest) and ready to be wrapped by Capacitor for Android.

## Architecture

```
Astro static build (Preact islands, supabase-js for sign-in only)
   │  REST + Authorization: Bearer <Supabase JWT>
   ▼
FastAPI backend (SQLModel) — verifies the JWT, applies roles + validation
   │                    ├──► NLM RxTerms API   (drug autocomplete, free, no key)
   │                    └──► Groq API          (translation + missed-dose summary)
   ▼  DATABASE_URL
Postgres (Supabase) — plus Supabase Auth for users/passwords
```

**All data access goes through the backend.** The frontend uses supabase-js only to sign in/out and get
an access token. FastAPI verifies the Supabase JWT (ES256/RS256 via the project JWKS), reads `sub`
(the auth user id) and `email`, and looks up the app user row for role and family.

Row Level Security is enabled on all tables with no public policies, so the anon key can't touch data
directly — only the backend's database connection can. External calls are proxied through the backend so
keys stay server-side, results can be cached, and failures degrade gracefully.

The frontend builds to **static output only** (`output: 'static'`), with an absolute `PUBLIC_API_URL` and
no SSR, so the same build can later be wrapped by Capacitor for Android.

## Tech stack

| Layer | Choices |
|---|---|
| Backend | Python 3.14 · uv · FastAPI · SQLModel · psycopg 3 · PyJWT[crypto] · httpx · pytest · Ruff |
| Frontend | Node 22 · Astro 7 (static) · Preact · supabase-js · Biome · TypeScript |
| Data / services | Supabase Postgres + Auth · Groq (AI) · NLM RxTerms (drug names) |
| Dev vs demo DB | SQLite locally (`DATABASE_URL`) · Supabase Postgres for the demo — interchangeable |

## Data model

`Family` · `Profile` · `AppUser` (caregiver | member, id = Supabase auth user id) · `Medicine` ·
`ScheduleTime` · `DoseLog` · `Invitation` · `Translation`

Doses are **computed, not pre-generated**. A day's schedule is the active medicines' schedule times for
that date, left-joined with `DoseLog`. A dose with no log is `pending`, or `missed` once its time has
passed by more than an hour. Only marking a dose writes a row, so a duplicate is impossible.

Dose times are wall-clock times in the family's timezone (`Family.timezone`, default `Asia/Kolkata`).

## API

| Method & path | Purpose |
|---|---|
| `GET /health` | Liveness |
| `GET /me` | Current user, role, family, linked profile |
| `GET/POST /profiles`, `GET/PATCH/DELETE /profiles/{id}` | Profiles (writes = caregiver) |
| `GET/POST /medicines?profile_id=`, `GET/PATCH/DELETE /medicines/{id}` | Medicines + times (writes = caregiver) |
| `GET /schedule?date=&profile_id=` | Computed daily schedule with a status per dose |
| `POST /doses/mark` | `{medicine_id, date, time, status}` — upsert |
| `GET /adherence?profile_id=&from=&to=` | Percent taken, counts, per-day series, per-medicine breakdown, streak |
| `GET /alerts` | Low-adherence family members + medicines running out |
| `GET /drugs/suggest?q=` | Drug-name autocomplete (RxTerms) |
| `POST /insights/missed-summary` | AI summary of missed doses (with a rules fallback) |
| `POST /families` | Start a family (onboarding) |
| `GET /invitations/mine`, `POST /invitations/{id}/accept\|decline` | Answer an invitation |
| `GET/POST /invitations`, `DELETE /invitations/{id}` | Caregiver invites / cancel |
| `POST /translate` | Batch UI-string translation (cache first, then Groq) |

OpenAPI docs are served at `/docs` and are part of the demo.

## Validation and rules

Enforced in the API, with database constraints where marked **[DB]**:

1. **Duplicate medicine** — same profile + same name (case-insensitive) + same strength with overlapping
   dates → `409`, with a message naming the existing entry.
2. **Duplicate time** — a medicine can't list the same time twice → `422`. **[DB]** unique
   (`medicine_id`, `time_of_day`).
3. **Timing conflict (warning)** — another medicine for the same profile within 30 minutes → saved, but
   the response carries a `warnings` list shown in the UI.
4. **Dates and shape** — `end_date` ≥ `start_date`, at least one time, field lengths → `422`.
5. **Dose marking** — can't mark a future dose or a date outside the medicine's range → `422`.
   Re-marking updates the existing log. **[DB]** unique (`medicine_id`, `scheduled_date`, `scheduled_time`).
6. **Authorization** — a member touching another profile, or anyone touching another family → `403`
   (not a `404`, so no data leak). Invitations: `409` on a duplicate pending invite, inviting yourself,
   inviting an existing member, or accepting while already in a family; only the matching email can answer.

## Getting started

**Prerequisites:** Python 3.14 + [uv](https://docs.astral.sh/uv/), Node 22+, and a Supabase project
(Postgres + Auth). Groq and RxTerms are optional for local work.

### 1. Environment

The whole repo shares one `.env` at the root (git-ignored). Copy the template and fill it in:

```bash
cp .env.example .env
```

A local run with SQLite needs almost nothing filled in; the Supabase values are required for sign-in.

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | backend | Defaults to `sqlite:///./pillpal.db`. `postgresql://` is rewritten to `psycopg` (v3) automatically. |
| `SUPABASE_URL` | backend | JWT issuer / JWKS. |
| `SUPABASE_SERVICE_ROLE_KEY` | seed script | Secret. Only needed to create demo logins. |
| `CORS_ORIGINS` | backend | JSON array or comma-separated list. Add Capacitor origins for the Android build. |
| `GROQ_API_KEY`, `GROQ_MODEL` | backend | Optional. Without a key, summaries and translations fall back. |
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | frontend | Public values only. |
| `PUBLIC_API_URL` | frontend | Absolute backend URL, e.g. `http://localhost:8000`. |

Frontend config must be set when the site is **built** — Astro inlines `PUBLIC_*` at build time.

### 2. Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

- API: <http://localhost:8000> · docs: <http://localhost:8000/docs>
- Tables are created automatically on startup (`SQLModel.metadata.create_all`).
- On Supabase, apply `backend/migrations/*.sql` (in order) to create the schema and enable RLS.

### 3. Seed demo data

Creates the "Sharma Family": a caregiver, three member logins, seven medicines and seven days of dose
history with a realistic mix of taken/skipped/missed. Requires `SUPABASE_SERVICE_ROLE_KEY`.

```bash
cd backend
uv run python -m app.seed
```

Optional — pre-translate every UI string into all languages so the first page view in any language is
instant (safe to re-run; only missing strings are sent to Groq, so a full run takes several minutes):

```bash
uv run python -m app.prewarm          # all languages
uv run python -m app.prewarm hi ta     # just some
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:4321
```

## Testing and code quality

```bash
# backend
cd backend
uv run ruff check . && uv run ruff format --check .
uv run pytest -q

# frontend
cd frontend
npm run check    # biome check . && astro check
npm run build    # static build (also proves Capacitor-compatibility)
npm run format   # biome check --write .
```

Backend tests cover every validation rule, role checks, schedule computation (pending / missed / taken),
adherence maths, `/drugs/suggest` with the upstream mocked (success and failure), translation caching,
and the missed-summary rules fallback. They run against SQLite in memory with the auth dependency
overridden.

CI (`.github/workflows/ci.yml`) runs on every push and pull request: Ruff + pytest for the backend, and
`biome check` + `astro check` + a static `astro build` for the frontend.

## Project structure

```
PillPal/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI app, CORS, router wiring
│   │   ├── config.py          Settings (shared ../.env)
│   │   ├── db.py              engine + session (SQLite and Postgres)
│   │   ├── models.py          SQLModel tables
│   │   ├── schemas.py         Request/response bodies + field validation
│   │   ├── auth.py            Supabase JWT verification, role/ownership guards
│   │   ├── schedule.py        Dose computation (pending / missed / taken)
│   │   ├── formatting.py      Plain-language dates and 12-hour times
│   │   ├── groq.py            Groq client with graceful failure
│   │   ├── languages.py       The 23 languages (must match frontend i18n.ts)
│   │   ├── seed.py            Demo family + 7 days of history
│   │   ├── prewarm.py         Pre-translate all UI strings
│   │   └── routers/           me, profiles, medicines, doses, adherence, alerts,
│   │                          drugs, insights, invitations, translate
│   ├── migrations/            0001_init · 0002_invitations · 0003_translations · 0004_medicine_stock
│   └── tests/
├── frontend/
│   └── src/
│       ├── pages/             index, login, welcome, language, today, medicines, medicine,
│       │                      progress, family, invitations, print
│       ├── components/        TodayView, DoseCard, MedicineForm, ProgressView, FamilyView,
│       │                      InvitesPanel, LanguagePicker, PrintView, NavBar, Icon, …
│       ├── lib/               api, session, supabase, i18n, notifications, format
│       └── styles/global.css  Design tokens (colours, radii, spacing, type scale)
├── docs/
│   ├── problem-statements.pdf  Hackathon brief
│   ├── judging-rubric.jpeg     Scoring rubric (20 marks)
│   ├── ppt-content.md          Slide-by-slide deck content
│   └── superpowers/            Design spec and implementation plan
└── brag-output/                Promo film composition and UI screenshots
```

## Design

Organic / biophilic mood — soft off-white paper, leaf greens and sage, warm neutrals, rounded organic
shapes and pill-shaped buttons — but **senior-friendly rules always win where they conflict**:

- 22 px body text, headings 26–32 px, nothing below 16 px anywhere; in-app text-size control.
- Text contrast ≥ 7:1 (WCAG AAA) for body text; no light-grey text.
- Tap targets ≥ 56 px, full-width primary buttons, generous spacing.
- Status is **never colour alone** — always colour + icon + text label.
- Plain language: "Take 1 tablet after breakfast", not "1 tab PO pc".
- Visible labels above every field, large inputs, native date/time pickers.
- Plain-words error messages next to the field that say how to fix it.

**Status colours** (colour-blind-safe Okabe–Ito palette), always as a light tint background with a solid
left border, icon and near-black text:

| Status | Colour | Hex |
|---|---|---|
| Taken | Blue | `#0072B2` |
| Skipped | Orange | `#E69F00` |
| Pending | Sky blue | `#56B4E9` |
| Missed | Vermillion | `#D55E00` |

## Out of scope

Web Push with the browser fully closed (needs VAPID + a push service), the iOS build, SMS/email
reminders, drug-interaction checking, offline mode, and multi-family users.
