# PillPal — Design Spec

**Hackathon:** Vision2Web (2 days) · **Problem:** Theme 4 #2 — Medicine Reminder & Family Schedule
**Date:** 2026-09-27

## 1. Goal

A web app for managing medication schedules for family members. Users create profiles, add medicines with dosage
instructions and timing, mark doses as taken or skipped, and see a daily schedule and adherence summary. Validation
prevents duplicate or conflicting entries.

**Success = the demo flow works end to end with seed data:**
log in as caregiver → add profile → type "metf…" and pick *Metformin 500 mg Tab* from suggestions → see validation
reject a duplicate → view today's schedule → get a browser notification for a due dose → mark doses → view adherence
with the AI summary of missed doses → log in as a member and see only their own schedule.

**Judging rubric (20 marks, 5 each):** Functionality & Requirements · UI/UX & Frontend · Technical Implementation
(backend/API/DB/code structure) · Innovation & Presentation. Every design choice below is checked against these.

## 2. Architecture

```
Astro frontend (Preact islands, supabase-js for login only, service worker for notifications)
        │  REST + Authorization: Bearer <Supabase JWT>
        ▼
FastAPI backend (SQLModel) ── verifies JWT, applies roles + validation
        │                 ├──► NLM RxTerms API (drug-name autocomplete, free, no key)
        │                 └──► Claude API (missed-dose summary, optional)
        ▼  DATABASE_URL (Postgres)
Supabase Postgres  (+ Supabase Auth for users/passwords)
```

- **Repo layout:** `frontend/` (Astro) and `backend/` (FastAPI) in one GitHub repo.
- **All data access goes through FastAPI.** The frontend uses supabase-js only for sign-in/sign-out and to obtain the
  access token.
- FastAPI verifies the Supabase JWT, reads `sub` (auth user id), and looks up the app `User` row for role and family.
- Local dev can use SQLite via `DATABASE_URL`; demo/deploy uses Supabase Postgres. SQLModel keeps these interchangeable.
- RLS is enabled on all tables with no public policies, so the anon key cannot touch data directly; only the backend's
  DB connection can.
- **External calls are proxied through the backend** (drug search, AI), so keys stay server-side, results can be
  cached, and failures degrade gracefully.

## 3. Roles

| Role | Can |
|---|---|
| **Caregiver** | CRUD profiles and medicines for their family; view all schedules and adherence; mark any family dose; request AI summaries for any profile |
| **Member** | View only their own linked profile's schedule and adherence; mark only their own doses; request their own AI summary |

One family per caregiver. Member accounts are linked to a profile (seed script creates these for the demo; a
"link member email to profile" field covers it in the UI).

## 4. Data model

- **Family** — `id`, `name`
- **User** — `id` (= Supabase auth user id), `email`, `role` (`caregiver` | `member`), `family_id`, `profile_id` (nullable; set for members)
- **Profile** — `id`, `family_id`, `name`, `date_of_birth`, `notes` (allergies etc.)
- **Medicine** — `id`, `profile_id`, `name`, `strength` (e.g. "500 mg Tab"), `rxterms_name` (nullable; set when picked
  from suggestions), `instructions`, `start_date`, `end_date` (nullable = ongoing), `active`
- **ScheduleTime** — `id`, `medicine_id`, `time_of_day` (HH:MM)
- **DoseLog** — `id`, `medicine_id`, `scheduled_date`, `scheduled_time`, `status` (`taken` | `skipped`),
  `marked_at`, `marked_by` (user id). Unique on (`medicine_id`, `scheduled_date`, `scheduled_time`).

**Doses are computed, not pre-generated.** The day's schedule = active medicines × their schedule times for that
date, left-joined with DoseLog. A dose with no log is `pending`, or `missed` once its time has passed by > 1 hour.
Only marking a dose writes a row.

## 5. Validation rules (the "duplicate or conflicting entries" requirement)

Enforced in the API (and by DB constraints where marked **[DB]**); violations return clear JSON errors.

1. **Duplicate medicine** — same profile + same name (case-insensitive) + same strength with overlapping date range → `409`.
2. **Duplicate time** — a medicine cannot list the same time twice → `422`. **[DB]** unique (`medicine_id`, `time_of_day`).
3. **Timing conflict (warning)** — another medicine for the same profile within 30 min → saved, but the response includes a `warnings` list shown in the UI.
4. **Dates** — `end_date` ≥ `start_date`; at least one schedule time; field lengths/required via Pydantic → `422`.
5. **Dose marking** — cannot mark a future dose, or a date outside the medicine's range → `422`. Re-marking updates the existing log (upsert) rather than duplicating. **[DB]** unique key above.
6. **Authorization** — a member touching another profile, or anyone touching another family → `403`.

Medicine names are **not** restricted to RxTerms results — free text is allowed so a missing or offline drug
database never blocks the user.

## 6. REST API

| Method & path | Purpose |
|---|---|
| `GET /me` | Current user, role, family, linked profile |
| `GET/POST /profiles`, `GET/PATCH/DELETE /profiles/{id}` | Profiles (write = caregiver) |
| `GET/POST /medicines?profile_id=`, `GET/PATCH/DELETE /medicines/{id}` | Medicines + schedule times (write = caregiver) |
| `GET /schedule?date=&profile_id=` | Computed daily schedule with status per dose |
| `POST /doses/mark` | `{medicine_id, date, time, status}` upsert |
| `GET /adherence?profile_id=&from=&to=` | `%` taken, taken/skipped/missed counts, per-day series, current streak |
| `GET /drugs/suggest?q=` | Drug-name autocomplete (see §7) |
| `POST /insights/missed-summary` | `{profile_id, from, to}` → AI summary of missed doses (see §8) |
| `GET /health` | Liveness |

OpenAPI docs at `/docs` are part of the demo.

## 7. Drug-name autocomplete

- **Source:** NLM Clinical Tables **RxTerms** API
  (`https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=<q>&ef=STRENGTHS_AND_FORMS&maxList=8`).
  Free, no API key, purpose-built for autocomplete, and returns the available strengths/forms per drug
  (e.g. `metFORMIN (Oral Pill)` → `500 mg Tab`, `850 mg Tab`, …). Verified working 2026-09-27. openFDA was also
  checked and works, but it has no prefix search tuned for typing and no strength list, so RxTerms is the better fit.
- **Backend** `GET /drugs/suggest?q=`: requires ≥ 2 characters; 3 s timeout; in-memory LRU cache per query;
  returns `[{name, strengths[]}]`. On upstream failure it returns `[]` with `200` so the form keeps working.
- **Frontend:** accessible combobox (ARIA `combobox`/`listbox`, arrow keys + Enter), 250 ms debounce. Picking a drug
  fills the name and turns the strength field into a dropdown of that drug's strengths (free text still allowed).

## 8. AI summary of missed doses

- **Endpoint** `POST /insights/missed-summary` gathers the profile's doses in the range (default last 7 days) and
  computes the facts in code first: missed/skipped counts per medicine, which times of day are most often missed,
  weekday patterns, and streak.
- **LLM:** the Claude API (model set by the `AI_MODEL` env var) turns those facts into a short, friendly 2–4 sentence
  summary with one practical tip (e.g. "Evening doses are missed most — try pairing them with dinner"). The prompt
  forbids medical advice (no dosage changes, no "stop taking"), and the UI shows a "not medical advice" line under it.
- **Privacy:** only the profile's first name, medicine names, and dose times/statuses are sent — no date of birth,
  notes, or email.
- **Fallback:** if `ANTHROPIC_API_KEY` is unset or the call fails/times out (10 s), the endpoint returns a rule-based
  summary built from the same facts, flagged `"source": "rules"`. The feature always works in the demo.
- Summaries are generated on request (a button on the Adherence page), not on every page load.

## 9. Browser notifications

- **Permission** is requested only when the user clicks "Enable reminders" (never on page load); the state is shown
  in the header (on / off / blocked, with a hint for blocked).
- A **service worker** is registered, and notifications are shown via `registration.showNotification(...)` so they
  work while the PillPal tab is open in the background, and clicking one focuses the app on the Today page.
- The client polls `GET /schedule` every 60 s; when a dose becomes due (and again once when it becomes overdue) it
  fires a notification ("Grandpa — Metformin 500 mg, 1 tablet after food, due 8:00 PM"). A per-dose "already
  notified" set in `localStorage` prevents repeats.
- In-app banner + badge for due/overdue doses remain as the fallback when notifications are off or unsupported.
- **Limitation (stated in the demo):** notifications fire while the app is open in some tab. Reminders with the browser
  fully closed need Web Push (VAPID + push service), which is out of scope for 2 days.

## 10. UI design — organic / biophilic

- **Feel:** calm, natural, reassuring. Soft off-white "paper" background with subtle leaf-green and sage tones, warm
  neutrals, rounded organic shapes (large radii, pill-shaped buttons — fitting the name), gentle shadows, soft leaf/
  botanical line illustrations for empty states and the login page. Generous whitespace, large readable type (older
  family members are users), minimum 44 px tap targets.
- **Dose status colours (fixed, colour-blind-safe Okabe–Ito palette):**

  | Status | Colour | Hex | Icon |
  |---|---|---|---|
  | Taken | Blue | `#0072B2` | ✅ check |
  | Skipped | Orange | `#E69F00` | ⏭️ skip |
  | Pending | Sky Blue | `#56B4E9` | ⏳ hourglass |
  | Missed | Vermillion | `#D55E00` | ❌ cross |

  Status is **never shown by colour alone** — always colour + icon + text label. Text on these colours is checked for
  WCAG AA contrast (dark text on Sky Blue/Orange, white on Blue/Vermillion where it passes, otherwise the colour is used
  for the chip border/icon with dark text).
- **Design tokens** are CSS custom properties in one `tokens.css` (brand greens, neutrals, status colours, radii,
  spacing), used across all pages; charts reuse the status colours.
- **Pages:** Login · Today (timeline grouped by time per family member, Taken/Skip buttons, person filter, date
  picker) · Profiles · Medicine form (autocomplete, inline validation errors and conflict warnings) · Adherence
  (% ring, 7-day stacked bar chart in status colours, streak, per-medicine breakdown, AI summary card).
- Responsive, mobile-first; keyboard-accessible; `prefers-reduced-motion` respected.
- Footer disclaimer: "For reminders only — not medical advice."

## 11. Code quality & workflow

- **Frontend:** **Biome** for lint + format (`biome.json` in `frontend/`); `npm run check` = `biome check .` + `astro check`.
- **Backend:** **Ruff** for lint + format (config in `backend/pyproject.toml`); `ruff check .` and `ruff format --check .`.
- Type hints throughout the backend; Pydantic/SQLModel schemas for all request/response bodies; secrets only in
  `.env` (git-ignored) with a committed `.env.example`.
- **GitHub Actions CI** on every push: Biome + astro check (frontend), Ruff + pytest (backend).
- **Git:** small commits, each run through Biome/Ruff first, and **pushed to GitHub (`origin`
  = github.com/hemagiri-rs/PillPal) after every commit.**

## 12. Testing & seed data

- **pytest** (FastAPI TestClient, SQLite in-memory, auth dependency overridden): each validation rule in §5, role
  checks in §3, schedule computation (pending/missed/taken), adherence math, `/drugs/suggest` with the upstream mocked
  (success + failure → `[]`), missed-summary facts and the rules fallback (AI mocked).
- **Seed script:** 1 family, 1 caregiver + 3 members (Supabase auth users + app rows), ~6 medicines, 7 days of dose
  history with a mix of taken/skipped/missed so charts and the AI summary look real.

## 13. Out of scope

Web Push with the browser closed, SMS/email, drug-interaction checks, refill/stock tracking, multi-family users,
offline mode.

## 14. Stretch (if time remains, in priority order)

1. "Caregiver alert" card: members with adherence < 80 % this week.
2. Printable weekly schedule view (for the fridge or pharmacist).
