import { useEffect, useState } from "preact/hooks";
import { type ApiError, api, type Medicine, type Profile } from "../lib/api";
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
                  <article key={m.id} class={`card med-card${m.active ? "" : " med-paused"}`}>
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
