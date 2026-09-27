import { useEffect, useState } from "preact/hooks";
import { type ApiError, api, type Medicine, type Profile, patch } from "../lib/api";
import { fmtLongDate, fmtTime } from "../lib/format";
import { useT } from "../lib/i18n";
import { useMe } from "../lib/session";
import { Instructions } from "./DoseCard";
import { Icon } from "./Icon";

export default function MedicinesView() {
  const t = useT();
  const { me } = useMe();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    Promise.all([api<Profile[]>("/profiles"), api<Medicine[]>("/medicines")])
      .then(([ps, ms]) => {
        setProfiles(ps);
        setMeds(ms);
      })
      .catch((e: ApiError) => setError(t(e.message)));
  }, [me]);

  if (error)
    return (
      <div class="notice notice-error" role="alert">
        <Icon name="alert" />
        <span>{error}</span>
      </div>
    );
  if (!me || !profiles) return <p aria-live="polite">{t("Loading medicines…")}</p>;
  const caregiver = me.role === "caregiver";

  return (
    <div>
      <h1>{caregiver ? t("Medicines") : t("My medicines")}</h1>
      {caregiver && (
        <a class="btn btn-primary btn-huge btn-block add-med" href="/medicine">
          <Icon name="plus" />
          {t("Add a medicine")}
        </a>
      )}

      {profiles.map((p) => {
        const mine = meds.filter((m) => m.profile_id === p.id);
        return (
          <section key={p.id} class="person-section" aria-labelledby={`p-${p.id}`}>
            {caregiver && <h2 id={`p-${p.id}`}>{p.name}</h2>}
            {mine.length === 0 ? (
              <p class="hint">
                {t("No medicines yet.")}{" "}
                {caregiver && (
                  <a href={`/medicine?profile=${p.id}`}>
                    {t("Add one for {name}", { name: p.name })}
                  </a>
                )}
              </p>
            ) : (
              <div class="stack">
                {mine.map((m) => (
                  <article
                    key={m.id}
                    id={`med-${m.id}`}
                    class={`card med-card${m.active ? "" : " med-paused"}`}
                  >
                    <div class="med-head">
                      <h3>
                        {m.name} <span class="dose-strength">{m.strength}</span>
                      </h3>
                      {!m.active && <span class="tag">{t("Stopped")}</span>}
                    </div>
                    <Instructions text={m.instructions} />
                    <p class="med-times">
                      <Icon name="clock" />
                      {m.times.map(fmtTime).join(", ")}
                    </p>
                    <p class="hint">
                      {t("From {date}", { date: fmtLongDate(m.start_date) })}
                      {m.end_date ? ` → ${fmtLongDate(m.end_date)}` : ` · ${t("ongoing")}`}
                    </p>
                    <Stock
                      med={m}
                      canRefill={caregiver}
                      onSaved={(u) => setMeds(meds.map((x) => (x.id === u.id ? u : x)))}
                    />
                    {caregiver && (
                      <a class="btn btn-secondary" href={`/medicine?id=${m.id}`}>
                        <Icon name="edit" />
                        {t("Change")}
                      </a>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const REFILL_DAYS = 5;

/** Tablets left + a simple Refill form (sets the new count). */
function Stock({
  med,
  canRefill,
  onSaved,
}: {
  med: Medicine;
  canRefill: boolean;
  onSaved: (m: Medicine) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (med.pills_left === null && !canRefill) return null;
  const low = med.days_left !== null && med.days_left <= REFILL_DAYS;

  async function save(e: SubmitEvent) {
    e.preventDefault();
    const n = Number(new FormData(e.currentTarget as HTMLFormElement).get("count"));
    if (!Number.isInteger(n) || n < 0 || n > 10000) {
      setError(t("Please enter a number from 0 to 10000."));
      return;
    }
    try {
      onSaved(await patch<Medicine>(`/medicines/${med.id}`, { pills_left: n }));
      setOpen(false);
      setError(null);
    } catch (err) {
      setError(t((err as ApiError).message));
    }
  }

  return (
    <div class={`stock${low ? " stock-low" : ""}`}>
      {med.pills_left !== null ? (
        <p>
          <Icon name="pill" class="inline-icon" />
          {t("{pills} left · about {days} day(s)", {
            pills: med.pills_left,
            days: med.days_left ?? 0,
          })}
          {low && <strong> · {t("Buy more soon")}</strong>}
        </p>
      ) : (
        <p class="hint">{t("Tablet count not tracked.")}</p>
      )}
      {canRefill &&
        (open ? (
          <form class="refill-form" onSubmit={save} noValidate>
            <label for={`count-${med.id}`}>{t("How many tablets are there now?")}</label>
            <input
              id={`count-${med.id}`}
              name="count"
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              defaultValue={String(med.pills_left ?? "")}
            />
            {error && <p class="field-error">{error}</p>}
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">
                {t("Save")}
              </button>
              <button type="button" class="btn btn-secondary" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" class="btn btn-secondary" onClick={() => setOpen(true)}>
            <Icon name="plus" />
            {med.pills_left === null ? t("Track tablets") : t("Refill")}
          </button>
        ))}
    </div>
  );
}
