import { useEffect, useState } from "preact/hooks";
import { type ApiError, api, type Medicine, type Profile } from "../lib/api";
import { fmtLongDate, fmtTime } from "../lib/format";
import { useMe } from "../lib/session";
import { Icon } from "./Icon";

export default function MedicinesView() {
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
      .catch((e: ApiError) => setError(e.message));
  }, [me]);

  if (error)
    return (
      <div class="notice notice-error" role="alert">
        <Icon name="alert" />
        <span>{error}</span>
      </div>
    );
  if (!me || !profiles) return <p aria-live="polite">Loading medicines…</p>;
  const caregiver = me.role === "caregiver";

  return (
    <div>
      <div class="page-head">
        <h1>Medicines</h1>
        {caregiver && (
          <a class="btn btn-primary" href="/medicine">
            <Icon name="plus" />
            Add medicine
          </a>
        )}
      </div>

      {profiles.map((p) => {
        const mine = meds.filter((m) => m.profile_id === p.id);
        return (
          <section key={p.id} class="person-section" aria-labelledby={`p-${p.id}`}>
            <h2 id={`p-${p.id}`}>{p.name}</h2>
            {mine.length === 0 ? (
              <p class="hint">
                No medicines yet.{" "}
                {caregiver && <a href={`/medicine?profile=${p.id}`}>Add one for {p.name}</a>}
              </p>
            ) : (
              <div class="stack">
                {mine.map((m) => (
                  <article key={m.id} class={`card med-card${m.active ? "" : " med-paused"}`}>
                    <div class="med-head">
                      <h3>
                        {m.name} <span class="dose-strength">{m.strength}</span>
                      </h3>
                      {!m.active && <span class="tag">Stopped</span>}
                    </div>
                    <p>{m.instructions}</p>
                    <p class="med-times">
                      <Icon name="clock" />
                      {m.times.map(fmtTime).join(", ")}
                    </p>
                    <p class="hint">
                      From {fmtLongDate(m.start_date)}
                      {m.end_date ? ` until ${fmtLongDate(m.end_date)}` : " · ongoing"}
                    </p>
                    {caregiver && (
                      <a class="btn btn-secondary" href={`/medicine?id=${m.id}`}>
                        <Icon name="edit" />
                        Edit {m.name}
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
