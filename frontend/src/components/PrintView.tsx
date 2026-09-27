import { useEffect, useState } from "preact/hooks";
import { type ApiError, api, type Medicine, type Profile } from "../lib/api";
import { addDays, firstName, fmtTime, fmtWeekday, isoDate, parseDate } from "../lib/format";
import { useT } from "../lib/i18n";
import { useMe } from "../lib/session";
import { Icon } from "./Icon";

/** Big-print weekly chart for the fridge or the pharmacist, with a box to tick for each dose. */
export default function PrintView() {
  const t = useT();
  const { me } = useMe();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [person, setPerson] = useState<number | null>(
    Number(new URLSearchParams(location.search).get("person")) || null,
  );
  const [meds, setMeds] = useState<Medicine[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    api<Profile[]>("/profiles").then(
      (ps) => {
        setProfiles(ps);
        setPerson((p) => p ?? me.profile_id ?? ps[0]?.id ?? null);
      },
      () => {},
    );
  }, [me]);

  useEffect(() => {
    if (!person) return;
    api<Medicine[]>(`/medicines?profile_id=${person}`).then(
      (ms) => setMeds(ms.filter((m) => m.active)),
      (e: ApiError) => setError(t(e.message)),
    );
  }, [person]);

  if (error)
    return (
      <div class="notice notice-error" role="alert">
        <Icon name="alert" />
        <span>{error}</span>
      </div>
    );
  if (!me || !meds) return <p aria-live="polite">{t("Loading…")}</p>;

  const who = profiles.find((p) => p.id === person);
  // Week starting today; one row per medicine and time, in time order
  const start = isoDate(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const rows = meds
    .flatMap((m) => m.times.map((time) => ({ m, time })))
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div class="print-page">
      <div class="no-print">
        <h1>{t("Print a weekly chart")}</h1>
        <p class="lead">{t("Stick it on the fridge, or show it to the pharmacist.")}</p>
        {me.role === "caregiver" && profiles.length > 1 && (
          <fieldset class="person-filter">
            <legend>{t("Whose chart?")}</legend>
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                class="chip"
                aria-pressed={person === p.id}
                onClick={() => setPerson(p.id)}
              >
                {firstName(p.name)}
              </button>
            ))}
          </fieldset>
        )}
        <button type="button" class="btn btn-primary btn-huge btn-block" onClick={() => print()}>
          {t("Print")}
        </button>
      </div>

      <section class="sheet" aria-label={t("Weekly chart")}>
        <h2>
          {t("{name}'s medicines", { name: who?.name ?? "" })} ·{" "}
          {parseDate(days[0]).toLocaleDateString()} – {parseDate(days[6]).toLocaleDateString()}
        </h2>
        {rows.length === 0 ? (
          <p>{t("No medicines yet.")}</p>
        ) : (
          <table class="sheet-table">
            <thead>
              <tr>
                <th scope="col">{t("Time")}</th>
                <th scope="col">{t("Medicine")}</th>
                {days.map((d) => (
                  <th key={d} scope="col" class="day-col">
                    {fmtWeekday(d)}
                    <br />
                    {Number(d.slice(8))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, time }) => (
                <tr key={`${m.id}-${time}`}>
                  <th scope="row" class="time-col">
                    {fmtTime(time)}
                  </th>
                  <td>
                    <strong>
                      {m.name} {m.strength}
                    </strong>
                    <br />
                    {t(m.instructions)}
                  </td>
                  {days.map((d) => (
                    <td key={d} class="tick" aria-label={t("Tick when taken")}>
                      {d >= m.start_date && (!m.end_date || d <= m.end_date) ? "☐" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p class="sheet-foot">{t("PillPal is for reminders only. It is not medical advice.")}</p>
      </section>
    </div>
  );
}
