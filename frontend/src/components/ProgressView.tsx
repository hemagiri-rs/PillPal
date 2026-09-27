import { useEffect, useState } from "preact/hooks";
import { type Adherence, type ApiError, api, type Profile, post, type Summary } from "../lib/api";
import { firstName } from "../lib/format";
import { useMe } from "../lib/session";
import { Icon } from "./Icon";
import { WeekChart } from "./WeekChart";

export default function ProgressView() {
  const { me } = useMe();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [person, setPerson] = useState<number | null>(
    Number(new URLSearchParams(location.search).get("profile")) || null,
  );
  const [data, setData] = useState<Adherence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    api<Profile[]>("/profiles").then((ps) => {
      setProfiles(ps);
      if (me.role === "member") setPerson(me.profile_id);
    });
  }, [me]);

  useEffect(() => {
    if (!me) return;
    setSummary(null);
    const q = person ? `?profile_id=${person}` : "";
    api<Adherence>(`/adherence${q}`).then(setData, (e: ApiError) => setError(e.message));
  }, [me, person]);

  async function getSummary() {
    if (!person) return;
    setSummaryBusy(true);
    try {
      setSummary(await post<Summary>("/insights/missed-summary", { profile_id: person }));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSummaryBusy(false);
    }
  }

  if (error)
    return (
      <div class="notice notice-error" role="alert">
        <Icon name="alert" />
        <span>{error}</span>
      </div>
    );
  if (!me || !data) return <p aria-live="polite">Loading progress…</p>;

  const { overall } = data;
  const caregiver = me.role === "caregiver";
  const selected = profiles.find((p) => p.id === person);
  const who = caregiver ? (selected ? firstName(selected.name) : "Everyone") : "You";

  return (
    <div>
      <h1>Progress</h1>
      <p class="hint">Last 7 days</p>

      {caregiver && profiles.length > 1 && (
        <fieldset class="person-filter">
          <legend>Show progress for</legend>
          {[{ id: null, name: "Everyone" }, ...profiles].map((p) => (
            <button
              key={p.id ?? "all"}
              type="button"
              class="chip"
              aria-pressed={person === p.id}
              onClick={() => setPerson(p.id)}
            >
              {p.id === null ? p.name : firstName(p.name)}
            </button>
          ))}
        </fieldset>
      )}

      <div class="stat-row">
        <div class="card stat">
          <p class="stat-label">{who} took</p>
          <p class="stat-value">{overall.percent === null ? "–" : `${overall.percent}%`}</p>
          <p class="hint">
            {overall.taken} of {overall.taken + overall.skipped + overall.missed} doses due
          </p>
        </div>
        <div class="card stat">
          <p class="stat-label">Streak</p>
          <p class="stat-value">
            {data.streak_days} {data.streak_days === 1 ? "day" : "days"}
          </p>
          <p class="hint">in a row with every dose taken</p>
        </div>
      </div>

      <ul class="count-row" aria-label="Totals">
        <li class="count count-taken">
          <Icon name="check" /> {overall.taken} taken
        </li>
        <li class="count count-skipped">
          <Icon name="skip" /> {overall.skipped} skipped
        </li>
        <li class="count count-missed">
          <Icon name="x" /> {overall.missed} missed
        </li>
      </ul>

      <section class="card ai-card" aria-labelledby="ai-title">
        <h2 id="ai-title">
          <Icon name="sparkles" /> Weekly summary
        </h2>
        {!person ? (
          <p>Choose a person above to get a summary of their week.</p>
        ) : summary ? (
          <>
            <p class="ai-text">{summary.summary}</p>
            <p class="hint">
              {summary.source === "ai"
                ? "Written by AI from the dose history."
                : "Made from the dose history."}{" "}
              Not medical advice.
            </p>
          </>
        ) : (
          <>
            <p>
              Get a short, friendly summary of {who === "You" ? "your" : `${who}'s`} week and a tip.
            </p>
            <button
              type="button"
              class="btn btn-primary"
              disabled={summaryBusy}
              onClick={getSummary}
            >
              <Icon name="sparkles" />
              {summaryBusy ? "Writing summary…" : "Get summary"}
            </button>
          </>
        )}
      </section>

      <div class="card">
        <WeekChart days={data.days} today={data.end} />
      </div>

      {data.medicines.length > 0 && (
        <section aria-labelledby="per-med" class="per-med">
          <h2 id="per-med">By medicine</h2>
          <div class="stack">
            {data.medicines.map((m) => (
              <div key={m.medicine_id} class="card med-progress">
                <div class="med-progress-head">
                  <span>
                    <strong>{m.name}</strong> {m.strength}
                    {caregiver && !person && (
                      <span class="hint"> · {firstName(m.profile_name)}</span>
                    )}
                  </span>
                  <strong>{m.percent === null ? "–" : `${m.percent}%`}</strong>
                </div>
                <div class="meter" aria-hidden="true">
                  <span style={{ width: `${m.percent ?? 0}%` }} />
                </div>
                <p class="hint">
                  {m.taken} taken · {m.skipped} skipped · {m.missed} missed
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
