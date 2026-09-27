# PillPal — Presentation Content (slide by slide)

Copy-paste material for building the deck. Each slide has the **on-slide text** and **speaker notes**.
`→` marks speaker notes. Timing assumes a 5–7 minute pitch; the demo is the centrepiece.

**Deck theme:** calm, organic, senior-friendly. Paper background `#F6F4EC`, leaf green `#24532F`,
text `#1F2A24`, status colours Taken `#0072B2` · Skipped `#E69F00` · Pending `#56B4E9` · Missed `#D55E00`.
Fonts: Lora (headings) + Atkinson Hyperlegible (body). Left-align text, no more than 6 bullets a slide.

---

## Slide 1 — Title

**PillPal**
*Medicine reminders for the whole family.*
Vision2Web Hackathon · Theme 4, Problem 2

→ One line to open: "Grandparents forget doses. Families forget who gave what. PillPal is the app
between them." Name the team and move on — don't spend more than 15 seconds here.

---

## Slide 2 — The problem statement, clause by clause

> "Build a reminder application for managing medication schedules for family members. Users can create
> profiles, add medicines with dosage instructions and timing, and mark doses as taken or skipped.
> Provide a daily schedule and adherence summary. Include validation to avoid duplicate or conflicting
> entries."

| Clause in the brief | Where it lives in PillPal |
|---|---|
| Managing medication schedules **for family members** | Family + Profile — the caregiver's home shows one card per person |
| Users can **create profiles** | Profiles page, or created automatically when an invite is accepted |
| Add medicines with **dosage instructions and timing** | Medicines page — name, strength, plain-language instructions, times, date range |
| **Mark doses as taken or skipped** | "I took it" / "Not taking it" on every dose card, with Undo |
| **Daily schedule** | Today — the day's doses, each with a computed status |
| **Adherence summary** | Progress — %, 7-day chart, streak, per-medicine breakdown |
| **Validation to avoid duplicate or conflicting entries** | 409 on a duplicate, 422 on duplicate times, conflicts within 30 minutes warned (slide 10) |

**All seven clauses are implemented — and then we built for the person who actually has to use it.**

→ Point at the last row and say: "That's the clause most teams skip. We wrote tests for it." Then the
one-liner: this app is used by a 70-year-old, not a 20-year-old — so we designed for that.

---

## Slide 3 — Who it is for

**Ramesh, 72** — takes 3 medicines a day. Can't read 10 px grey text. Doesn't speak English.
**Priya, 41** — runs the family's medicines from another city. Doesn't know what he skipped.
**Kamala, 68** — wants one button, not a form.

**Design rule: if a feature doesn't work for Ramesh, it doesn't ship.**

→ This is the differentiator slide. Everything after this is a consequence of these three people.

---

## Slide 4 — What PillPal does (feature map)

| | |
|---|---|
| **Today** | One giant card: the next medicine, and **I took it** |
| **Family** | One card per person: "Ramesh — 1 medicine due now" |
| **Medicines** | Add in 4 short steps; drug names auto-complete |
| **Progress** | Adherence %, 7-day chart, streak, per-medicine breakdown |
| **Alerts** | "Runs out in about 3 days", "Kamala is at 71% this week" |
| **AI summary** | Plain-language weekly review with one practical tip |
| **23 languages** | English + all 22 scheduled Indian languages, RTL included |
| **Print** | Weekly A4 tick-chart for the fridge or pharmacist |

→ Don't read the table. Point at the two or three you'll demo, then move.

---

## Slide 5 — Feature: the daily schedule

- Doses are **computed, not pre-generated**: active medicines × their times, joined with what was marked.
- Status per dose: **Pending → Missed** automatically an hour past the time.
- Times are wall-clock in the **family's timezone** — "8:00 PM" means 8:00 PM in the family's home,
  not on the server.
- History survives edits: removing a schedule time still counts doses already logged.

→ The "removing a time doesn't break history" point is a real bug class — mention it, it signals care.
Also: one row per dose is impossible to duplicate because only *marking* writes.

---

## Slide 6 — Feature: marking a dose (senior-first interaction)

- The **Taken** button is the largest element on the card. Skip is secondary and visually distinct.
- Marking shows a big confirmation: "✓ Metformin marked as taken at 8:05 PM" with a visible **Undo**
  for 10 seconds.
- **No** "Are you sure?" dialogs, no swipe gestures, no long-press, no double-tap.
- Destructive actions (delete a medicine or profile) get their own confirm screen that names exactly
  what will be deleted.

→ Talking point: confirm dialogs are the wrong tool for elderly users — they train people to tap "yes".
A visible Undo is both kinder and safer.

---

## Slide 7 — Feature: adherence and alerts

- **Adherence**: taken / skipped / missed / pending, a percentage that excludes doses not yet due, a
  7-day stacked chart, a streak, and a per-medicine breakdown.
- **Streak** logic: a day where everything due was taken extends it; a day with nothing due yet neither
  breaks nor extends it.
- **Alerts** — the "it notices before you do" part:
  - Family members below **80%** adherence this week.
  - Medicines whose remaining tablets last **5 days or fewer**, with a Refill action.

→ Leaderboard-free, shame-free framing: this is for helping, not scoring the family.

---

## Slide 8 — Feature: family and invitations

- Caregiver invites by email → the invite list shows **Invited / Joined / Said no**; cancel and re-invite.
- The invited person sees "**Priya invited you to join the Sharma family**" → Yes (name + optional DOB)
  or No.
- A profile — and therefore reminders — **exists only after accepting**.
- "Add a person without a phone" keeps support for those who don't want an account.
- No emails are sent: invitations are in-app only (no SMTP to configure at a hackathon).

→ Role model on the next slide; keep this one about the human flow.

---

## Slide 9 — Roles and who can do what

| | Caregiver | Member |
|---|---|---|
| Profiles & medicines | Create, edit, delete for the family | — |
| Schedule | Everyone's, any date | Own only |
| Mark a dose | Any family dose | Own doses only |
| Adherence & AI summary | Any profile | Own profile |
| Invitations | Send, cancel, re-invite | Accept or decline |

**A member opening another profile's URL gets 403, not 404** — never a hint that the data exists.

→ The 403-not-404 detail is a security point the judges will like. Say why: a 404 leaks existence.

---

## Slide 10 — Validation: "duplicate or conflicting entries" (the required bit)

1. **Duplicate medicine** (same person, name, strength, overlapping dates) → **409** with a message that
   names the existing entry and tells you what to do instead.
2. **Duplicate time** on one medicine → **422** (+ a database unique constraint).
3. **Timing conflict** — another medicine within 30 minutes → *saved, with a warning shown in the UI*.
4. **Bad shape** — end date before start date, no times, field lengths → **422**.
5. **Dose marking** — future dose, or a date outside the medicine's range → **422**; re-marking updates
   instead of duplicating.
6. **Authorization** — cross-profile and cross-family access → **403**.

**Duplicate = error, conflict = warning.** We don't block a real prescription because it's 20 minutes
from another one.

→ This is the rubric's "validation" clause, answered in one slide. The last line is the design insight:
knowing the difference between an error and a warning is the maturity here. Errors are shown **next to
the field**, in plain words, saying how to fix it — never a code.

---

## Slide 11 — UI/UX & Frontend Design: usability and visual consistency

The rubric asks for *interface quality, responsiveness, usability, visual consistency, navigation and
overall user experience*. Concretely, that means:

**Usability — designed for the primary user, not the average one**
- **22 px** body text, headings 26–32 px, nothing below 16 px anywhere; in-app text-size control.
- Text contrast **≥ 7:1 (WCAG AAA)**; no light-grey text.
- Tap targets **≥ 56 px**, full-width primary buttons, 12 px+ of spacing between them.
- Status is **never colour alone** — always **colour + icon + text label**.
- Plain words: "Take 1 tablet after breakfast", not "1 tab PO pc".

**Visual consistency — one source of truth**
- A single `global.css` token file drives every colour, radius, spacing value and type size; no page
  invents its own.
- The same action looks the same everywhere: every primary button, every dose status, every card.
- Times are always 12-hour ("8:00 PM") and dates always "Today" / "Yesterday" / "Mon 28 Sep" — no ISO
  dates anywhere in the UI.

**Navigation and overall experience**
- Bottom tab bar on mobile with a visible word under every icon; the same layout on every page, so the
  same thing is always in the same place.
- Responsive and mobile-first; `prefers-reduced-motion` respected; Lighthouse accessibility ≥ 95.

→ Contrast note worth saying out loud: the vermillion "missed" colour fails contrast against both white
and black text, so status chips use a **light tint background + solid border + icon + near-black text**.
We measured it instead of guessing. And "visual consistency" here isn't an aesthetic claim — it's one
shared token file, which we can open and show.

---

## Slide 12 — The psychology behind the design (Laws of UX)

**Every design decision here is traceable to a known principle** — the 30 laws from
[lawsofux.com](https://lawsofux.com/) (Jon Yablonski).

| What we did | Law | Why it matters for a 72-year-old |
|---|---|---|
| Member home shows **one** "next dose" card, not the day's list | [Hick's Law](https://lawsofux.com/hicks-law/) | Decision time grows with the number of choices; one obvious action beats a menu |
| Tap targets **56–64 px**, Taken is the biggest element, destructive actions are never the easy target | [Fitts's Law](https://lawsofux.com/fittss-law/) | Big, close, well-spaced targets — and the law itself warns against making destructive actions easy to hit |
| One emphasised action per card; status shown as **colour + icon + word** | [Von Restorff Effect](https://lawsofux.com/von-restorff-effect/) | Emphasis is zero-sum, and the law says don't rely on colour alone — it fails for low vision |
| The server computes doses, timezone, missed status and the 30-minute conflict warning | [Tesler's Law](https://lawsofux.com/teslers-law/) | Complexity is conserved: we paid for it in code so the caregiver doesn't pay for it every day |
| Free-text medicine names, normalised case and whitespace, flexible input | [Postel's Law](https://lawsofux.com/postels-law/) | Accept messy input generously, produce strict and predictable output |
| Bottom tab bar, logo links home, native date/time pickers, standard controls | [Jakob's Law](https://lawsofux.com/jakobs-law/) | Familiar patterns mean nothing has to be learned first |
| Add-medicine as 4 steps, with "Which medicine — step 2 of 4" visible | [Goal-Gradient Effect](https://lawsofux.com/goal-gradient-effect/) + [Zeigarnik Effect](https://lawsofux.com/zeigarnik-effect/) | Visible progress and visible incompleteness both drive completion |
| Today's doses are **shown**, never remembered; the instruction text stays on the card | [Working Memory](https://lawsofux.com/working-memory/) | Recognition beats recall — working memory holds ~4–7 chunks for ~20–30 seconds |
| Large confirmation with **Undo**; errors end by saying how to fix it | [Peak-End Rule](https://lawsofux.com/peak-end-rule/) | People judge an experience by its most intense moment and its ending — so the stressful moment is designed |
| The card flips to "Taken at 8:05 PM" immediately | [Doherty Threshold](https://lawsofux.com/doherty-threshold/) | Under about 400 ms, it never feels like waiting |
| No product tour; language first, then straight into the task | [Paradox of the Active User](https://lawsofux.com/paradox-of-the-active-user/) | People don't read manuals — they start clicking |
| Dose cards group name + strength + instruction + time; one card per person | [Proximity](https://lawsofux.com/law-of-proximity/) + [Common Region](https://lawsofux.com/law-of-common-region/) + [Chunking](https://lawsofux.com/chunking/) | Group by spacing first, containers second |

**Where we deliberately break a law.** Jakob's Law says follow the conventions — but the conventions were
built for a 25-year-old's eyes and hands. We break them on type size (22 px), contrast (7:1) and target
size (56 px+), because matching the standard would fail the actual user.

**Where we refuse a law.** The Zeigarnik guidance warns against "weaponising open loops with endless
streaks and nagging". We show a streak and step progress, but the framing is shame-free, there is exactly
**one** follow-up reminder, and nothing here is optimised for time-on-site.

**Miller's Law, used correctly.** We did **not** cap the navigation at 7 items — the law is constantly
misused that way. Its real lesson is **chunking**, so we group instead, and every icon carries a word.

→ Don't read the table. Pick three rows — Fitts, Tesler, Peak-End — and tell the story behind each. The
"where we break the law" line and the Zeigarnik ethics line are the two that show judgment; say both.

---

## Slide 13 — 23 languages, live

- English plus the **22 scheduled languages of India** — Hindi, Bengali, Telugu, Marathi, Tamil, Urdu,
  Gujarati, Kannada, Malayalam, Odia, Punjabi, Assamese, Maithili, Santali, Kashmiri, Nepali, Konkani,
  Sindhi, Dogri, Manipuri, Bodo, Sanskrit.
- **RTL layout** for Urdu, Kashmiri and Sindhi.
- Flow: **database cache → Groq (batched) → browser cache**. A pre-warm script fills the cache for every
  string, so the first view in any language is instant.
- **Medicine names are never translated.** Instructions are translated with the English original shown
  beneath, so nothing is lost in translation.
- Groq down → the app stays in English. It never breaks.

→ Honest limitation to state: model quality for Bodo, Santali, Dogri and Manipuri is weaker and needs
native review before real-world use. Saying this makes the rest of your claims more believable.

---

## Slide 14 — The AI parts (and why they don't break)

**Missed-dose summary** — facts computed in code first: missed/skipped per medicine, which times of day
are missed most, weekday patterns, streak. Groq then writes 2–4 friendly sentences with one tip.

- Prompt **forbids medical advice** — no dosage changes, no "stop taking". The UI shows
  "not medical advice."
- **Privacy:** only the first name, medicine names and dose times/statuses are sent. No date of birth,
  no notes, no email.
- **Fallback:** if there's no API key or the call fails or times out (10 s), the endpoint returns a
  rule-based summary from the same facts, flagged `"source": "rules"`.

**Drug-name autocomplete** — NLM RxTerms (free, no key) returns the available strengths/forms per drug.
2-character minimum, 3-second timeout, LRU cache, and on upstream failure it returns `[]` with a 200 so
the form keeps working. Free text is always allowed.

→ The theme: **AI is an enhancement, never a dependency.** Every AI path has a deterministic
non-AI path behind it. That's the whole point of the "core application must work without AI" idea in
Theme 5, applied here.

---

## Slide 15 — Architecture

```
Astro static build (Preact islands; supabase-js for sign-in only)
   │  REST + Authorization: Bearer <Supabase JWT>
   ▼
FastAPI backend (SQLModel) — verifies JWT, applies roles + validation
   │                    ├──► NLM RxTerms  (drug autocomplete)
   │                    └──► Groq         (translation + summary)
   ▼  DATABASE_URL
Postgres (Supabase)  +  Supabase Auth
```

- **All data access goes through the backend.** The frontend only signs in.
- Backend verifies the Supabase JWT via the project JWKS (ES256/RS256), reads `sub` and `email`.
- **RLS on every table with no public policies** — the anon key can't read data directly.
- External API keys stay server-side; results are cached; failures degrade gracefully.
- Static output + absolute `PUBLIC_API_URL` = the same build wraps into Android with Capacitor.

→ If asked "why not query Supabase directly from the frontend?" — because then every authorization rule
would live in the browser. One place to enforce rules is the point.

---

## Slide 16 — Technical implementation and code structure

The rubric asks about *HTML/CSS/JavaScript/framework quality, backend integration, database/API
implementation, code structure and technical execution*.

**Frontend execution**
- Semantic HTML and native controls (date/time pickers rather than custom widgets), with real ARIA —
  `combobox`/`listbox` with arrow-key support on the drug autocomplete, not a styled div.
- **CSS custom properties** in one token file — no utility-class sprawl, no inline styles.
- TypeScript throughout, and `astro check` runs in CI, so it has to typecheck to ship.
- Astro ships almost no JavaScript: only the interactive parts (dose card, medicine form) are Preact
  islands. That matters on an old Android phone.

**Backend execution**
- Layered and typed by design: `models` (tables) → `schemas` (API contract) → `routers` (endpoints) →
  `schedule` (domain logic). Request/response bodies are deliberately separate from table models.
- One auth dependency chain — verify JWT → identity → app user → role guard — so every protected route
  *declares* what it needs and authorization can't be quietly forgotten inside a handler.
- Small focused modules: `formatting.py` (plain-language dates and times), `groq.py`, `languages.py`.

**Stack**

| Layer | |
|---|---|
| Backend | Python 3.14 · uv · **FastAPI** · **SQLModel** · psycopg 3 · PyJWT · httpx · pytest · **Ruff** |
| Frontend | Node 22 · **Astro 7 (static)** · **Preact** · supabase-js · TypeScript · **Biome** |
| Data & services | **Supabase** Postgres + Auth · **Groq** · **NLM RxTerms** |
| CI | GitHub Actions: Ruff + pytest · Biome + astro check + static build |

→ If asked "why Astro": because the rubric scores JavaScript quality, and the best JavaScript is the
JavaScript you don't ship.

---

## Slide 17 — Database design

`Family` · `Profile` · `AppUser` (caregiver | member) · `Medicine` · `ScheduleTime` · `DoseLog` ·
`Invitation` · `Translation`

Three decisions:

1. **Doses are computed, not stored.** A day's schedule = active medicines × times, joined with logged
   doses. Only marking writes a row — so duplicates are structurally impossible.
2. **Unique constraints back the API**: (`medicine_id`, `time_of_day`) and
   (`medicine_id`, `scheduled_date`, `scheduled_time`).
3. **Timezone lives on the family** (`Asia/Kolkata`), so "8:00 PM" is the family's 8:00 PM, and a server
   in another region can't shift someone's dose into the wrong day.

→ Point 1 is the answer to "how do you guarantee no duplicate entries?" — by design, not by checking.

---

## Slide 18 — Innovation

- **Senior-first, not senior-friendly-later.** The whole UI is built to the constraints above because
  the primary user is elderly.
- **23 Indian languages with RTL** — including medicine instructions translated while the original stays
  visible.
- **It notices before you do** — refill prediction from tablet stock, adherence alerts, and a weekly
  summary written in the user's language.
- **AI that cannot break the demo** — every AI path has a deterministic fallback.
- **Same codebase, web and Android** — static build, one build command.
- **Printable weekly chart** for the fridge — a paper feature for a real household.

→ Pick the two the judges will remember and repeat them in the closing slide.

---

## Slide 19 — Live demo (the flow)

1. **Language first** — pick Hindi; the whole app flips, layout included.
2. **Sign up / sign in** → Welcome with a pending invitation.
3. **Member home** — the giant "next medicine" card → tap **I took it** → confirmation + Undo.
4. **Caregiver home** — one card per person; "1 medicine due now" for Ramesh.
5. **Add a medicine** — type "metf…", pick *Metformin 500 mg Tab* from suggestions, choose a strength,
   then **add it again** → the duplicate is rejected in plain words.
   Add one 20 minutes from an existing dose → it warns, and still saves.
6. **Progress** — the % ring, the 7-day chart, the streak, then press **AI summary** → the summary
   types in.
7. **It notices before you do** — "Metformin runs out in about 3 days (7 left)".
8. **Print** — the weekly chart, ready for the fridge.

**Have these two ready:** a copy of the app already open, and seed data reloaded.

→ Rehearse this twice. The duplicate-rejection and the warning-but-saves are the two moments that prove
the required validation; don't rush them.

---

## Slide 20 — Rubric mapping, in the judges' own words

**1 · Functionality & Requirements** — *completeness of the required features, correctness of
functionality, and whether the solution addresses the given problem statement*
→ All seven clauses of Theme 4 #2 are implemented, and every "duplicate or conflicting entries" rule has
its own pytest test (slide 2). Additional useful features: invitations, adherence alerts, refill
prediction, printable chart.

**2 · UI/UX & Frontend Design** — *interface quality, responsiveness, usability, visual consistency,
navigation, and overall user experience*
→ Senior-first rules treated as requirements: 22 px body, 7:1 contrast, 56 px targets, colour + icon +
label. One token file for visual consistency and one labelled tab bar for navigation (slide 11). Every
choice traceable to a named UX law (slide 12).

**3 · Technical Implementation** — *quality of HTML/CSS/JavaScript/framework usage, backend integration,
database/API implementation, code structure, and technical execution*
→ Layered, fully typed FastAPI + SQLModel; JWT auth with role guards; RLS on every table; unique
constraints; schedules computed in the family's timezone; semantic HTML and CSS design tokens; Ruff +
Biome + GitHub Actions CI (slide 16).

**4 · Innovation & Presentation** — *creativity, originality, additional useful features,
problem-solving approach, and clarity of demonstration/presentation*
→ 23 Indian languages with RTL; AI that always degrades to a working fallback; refill prediction and
adherence alerts; one codebase for web and Android; and a demo where every claim is visible on screen
(slide 19).

→ Don't read this table aloud. Put it up and say: "every mark on this rubric has a screen behind it."

The brief's own Evaluation Areas map onto these four rows one to one: problem understanding and
completeness → row 1 · frontend usability and responsive design → row 2 · backend/API and database
integration → row 3 · functional correctness and validation → rows 1 and 3 · innovation and meaningful
use of the theme → row 4 · code quality, security awareness and error handling → row 3 · demo quality and
ability to explain technical decisions → the demo and the backup slides.

---

## Slide 21 — Scope and what's next

**Not built (deliberately):** push notifications with the browser fully closed, the iOS build, SMS/email
reminders, drug-interaction checking, offline mode, multi-family users.

**Next:** Web Push (VAPID) for reminders when the app is closed · native Android local notifications via
Capacitor so reminders fire with the app shut · native review of the weaker translation languages ·
pharmacist-verified drug interaction data.

→ Naming your limits is a strength. It shows you know where the product really stands.

---

## Slide 22 — Closing

**PillPal**
Medicine reminders for the whole family.
*For reminders only — not medical advice.*

`github.com/hemagiri-rs/PillPal`

→ End on the tagline, then stop talking. Let the demo screenshots sit on screen while you take questions.

---

# Backup slides (only if asked)

**B1 — How does "missed" work?** A dose with no log is pending; it becomes missed one hour after its
scheduled time, in the family's timezone. Nothing writes it — it's derived at read time, so it can never
disagree with the schedule.

**B2 — What happens if Groq is down?** Translation returns English; the summary returns a rule-based
version flagged `"source": "rules"`. Both endpoints still return 200 within their timeout. We can show
this by unsetting the key.

**B3 — How is the family's timezone used?** `Family.timezone` (default `Asia/Kolkata`). The client sends
its current time and the server converts to the family's zone before computing "due" and "missed", so a
dose can't land on the wrong day when the server or user is in another region.

**B4 — Why not let the frontend talk to Supabase directly?** Then every role and ownership rule would
live in the browser. RLS is on with no public policies, and all reads and writes go through FastAPI, so
the rules have exactly one home.

**B5 — How do you stop duplicate dose logs if a button is tapped twice?** The log table has a unique key
on (medicine, date, time) and marking is an upsert, so a double tap updates one row instead of creating
a second.

**B6 — Can it work without internet?** Not today — the frontend and API are separate. Offline mode is on
the "next" list.

**B7 — How long did it take?** Two days, with the spec and implementation plan committed under
`docs/superpowers/`.
