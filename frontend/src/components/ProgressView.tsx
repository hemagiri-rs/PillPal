import { useEffect, useState } from "preact/hooks";
import { type Adherence, type ApiError, api, type Profile, post, type Summary } from "../lib/api";
import { firstName } from "../lib/format";
import { getLang, speak, useT } from "../lib/i18n";
import { useMe } from "../lib/session";
import { Icon } from "./Icon";
import { WeekChart } from "./WeekChart";

export default function ProgressView() {
  const t = useT();
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
    if (me.role === "member") setPerson(me.profile_id);
    api<Profile[]>("/profiles").then(setProfiles, () => {});
  }, [me]);

  useEffect(() => {
    if (!me) return;
    setSummary(null);
    const q = person ? `?profile_id=${person}` : "";
    api<Adherence>(`/adherence${q}`).then(setData, (e: ApiError) => setError(t(e.message)));
  }, [me, person]);

  async function getSummary() {
    if (!person) return;
    setSummaryBusy(true);
    try {
      setSummary(
        await post<Summary>("/insights/missed-summary", {
          profile_id: person,
          lang: getLang().code, // written directly in the chosen language
        }),
      );
    } catch (e) {
      setError(t((e as ApiError).message));
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
  if (!me || !data) return <p aria-live="polite">{t("Loading…")}</p>;

  const { overall } = data;
  const caregiver = me.role === "caregiver";
  const selected = profiles.find((p) => p.id === person);
  const due = overall.taken + overall.skipped + overall.missed;

  return (
    <div>
      <h1>{caregiver ? t("Progress") : t("How am I doing?")}</h1>
      <p class="lead">{t("The last 7 days")}</p>

      {caregiver && profiles.length > 1 && (
        <fieldset class="person-filter">
          <legend>{t("Show")}</legend>
          {[{ id: null, name: t("Everyone") }, ...profiles].map((p) => (
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
          <p class="stat-label">
            {caregiver
              ? selected
                ? t("{name} took", { name: firstName(selected.name) })
                : t("Everyone took")
              : t("You took")}
          </p>
          <p class="stat-value">{overall.percent === null ? "–" : `${overall.percent}%`}</p>
          <p class="hint">
            {t("{taken} of {total} medicines", { taken: overall.taken, total: due })}
          </p>
        </div>
        <div class="card stat">
          <p class="stat-label">{t("Good days in a row")}</p>
          <p class="stat-value">{data.streak_days}</p>
          <p class="hint">{t("days with every medicine taken")}</p>
        </div>
      </div>

      <ul class="count-row" aria-label={t("Totals")}>
        <li class="count count-taken">
          <Icon name="check" /> {t("{n} taken", { n: overall.taken })}
        </li>
        <li class="count count-skipped">
          <Icon name="skip" /> {t("{n} not taken", { n: overall.skipped })}
        </li>
        <li class="count count-missed">
          <Icon name="x" /> {t("{n} missed", { n: overall.missed })}
        </li>
      </ul>

      <section class="card ai-card" aria-labelledby="ai-title">
        <h2 id="ai-title">
          <Icon name="sparkles" /> {t("Your week in short")}
        </h2>
        {!person ? (
          <p>{t("Choose a person above to hear about their week.")}</p>
        ) : summary ? (
          <>
            <p class="ai-text">{summary.summary}</p>
            {"speechSynthesis" in window && (
              <button
                type="button"
                class="btn btn-secondary speak-btn"
                onClick={() => speak(summary.summary)}
              >
                <Icon name="speaker" />
                {t("Read aloud")}
              </button>
            )}
            <p class="hint">
              {summary.source === "ai"
                ? t("Written by AI from the medicine history.")
                : t("Made from the medicine history.")}{" "}
              {t("Not medical advice.")}
            </p>
          </>
        ) : (
          <>
            <p>{t("Get a short, friendly note about the week and one helpful tip.")}</p>
            <button
              type="button"
              class="btn btn-primary btn-block"
              disabled={summaryBusy}
              onClick={getSummary}
            >
              <Icon name="sparkles" />
              {summaryBusy ? t("Writing…") : t("Tell me")}
            </button>
          </>
        )}
      </section>

      <div class="card">
        <WeekChart days={data.days} today={data.end} />
      </div>

      {data.medicines.length > 0 && (
        <section aria-labelledby="per-med" class="per-med">
          <h2 id="per-med">{t("Each medicine")}</h2>
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
                  {t("{taken} taken · {skipped} not taken · {missed} missed", {
                    taken: m.taken,
                    skipped: m.skipped,
                    missed: m.missed,
                  })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
