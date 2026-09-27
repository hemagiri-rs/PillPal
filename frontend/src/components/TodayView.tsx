import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { type ApiError, api, type Dose, type Profile, post, type Schedule } from "../lib/api";
import { addDays, firstName, fmtDay, fmtLongDate, fmtTime } from "../lib/format";
import { useT } from "../lib/i18n";
import { useMe } from "../lib/session";
import { DoseCard, minutes } from "./DoseCard";
import { Icon } from "./Icon";

const REFRESH_MS = 60_000;
const UNDO_MS = 10_000;

interface Toast {
  text: string;
  dose: Dose;
}

/**
 * Home. Member: their own day with one big "Next medicine" card.
 * Caregiver: one card per person; tapping opens that person's day (?person=id).
 */
export default function TodayView() {
  const t = useT();
  const { me, error: meError } = useMe();
  const [person, setPerson] = useState<number | null>(
    Number(new URLSearchParams(location.search).get("person")) || null,
  );
  const [day, setDay] = useState<string | null>(null); // null = family's today
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number>();

  const caregiver = me?.role === "caregiver";
  const personId = caregiver ? person : (me?.profile_id ?? null);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (day) q.set("date", day);
    if (personId) q.set("profile_id", String(personId));
    try {
      const s = await api<Schedule>(`/schedule?${q}`);
      setSchedule(s);
      if (!day) setToday(s.date);
      setError(null);
    } catch (e) {
      setError(t((e as ApiError).message));
    }
  }, [day, personId]);

  useEffect(() => {
    if (!me) return;
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [me, load]);

  useEffect(() => {
    if (caregiver) api<Profile[]>("/profiles").then(setProfiles, () => {});
  }, [caregiver]);

  function openPerson(id: number | null) {
    setPerson(id);
    setDay(null);
    history.pushState(null, "", id ? `/today?person=${id}` : "/today");
    window.scrollTo({ top: 0 });
  }

  async function mark(dose: Dose, status: "taken" | "skipped" | "pending") {
    setBusy(true);
    try {
      await post("/doses/mark", {
        medicine_id: dose.medicine_id,
        date: dose.date,
        time: dose.time,
        status,
      });
      await load();
      clearTimeout(toastTimer.current);
      if (status === "pending") {
        setToast(null);
      } else {
        setToast({
          text:
            status === "taken"
              ? t("Done! {medicine} marked as taken.", { medicine: dose.medicine_name })
              : t("{medicine} marked as not taken.", { medicine: dose.medicine_name }),
          dose,
        });
        toastTimer.current = window.setTimeout(() => setToast(null), UNDO_MS);
      }
    } catch (e) {
      setError(t((e as ApiError).message));
    } finally {
      setBusy(false);
    }
  }

  if (meError) return <ErrorNotice text={t(meError)} />;
  if (!me || !schedule || !today) return <p aria-live="polite">{t("Loading your medicines…")}</p>;

  const nowMinutes = minutes(schedule.now.slice(11, 16));
  const isToday = schedule.date === today;
  const toastEl = (
    <div class="toast-region" aria-live="polite">
      {toast && (
        <div class="toast">
          <Icon name="check" />
          <span>{toast.text}</span>
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => mark(toast.dose, "pending")}
          >
            <Icon name="undo" />
            {t("Undo")}
          </button>
        </div>
      )}
    </div>
  );

  // ---------- Caregiver overview: one card per person ----------
  if (caregiver && !person) {
    return (
      <div>
        <h1>{t("Today")}</h1>
        <p class="lead">{fmtLongDate(schedule.date)}</p>
        {error && <ErrorNotice text={error} />}
        {profiles.length === 0 && (
          <div class="empty card">
            <Icon name="users" />
            <p>{t("Add the people in your family to start.")}</p>
            <a class="btn btn-primary" href="/family">
              {t("Go to Family")}
            </a>
          </div>
        )}
        <div class="stack">
          {profiles.map((p) => {
            const mine = schedule.doses.filter((d) => d.profile_id === p.id);
            const due = mine.filter((d) => d.due);
            const next = mine.find((d) => d.status === "pending");
            const taken = mine.filter((d) => d.status === "taken").length;
            const missed = mine.filter((d) => d.status === "missed").length;
            return (
              <button
                key={p.id}
                type="button"
                class={`person-card${due.length ? " person-due" : missed && !next ? " person-missed" : ""}`}
                onClick={() => openPerson(p.id)}
              >
                <span class="person-name">{p.name}</span>
                <span class="person-status">
                  {mine.length === 0
                    ? t("No medicines today")
                    : due.length
                      ? t("{count} medicine(s) due now", { count: due.length })
                      : next
                        ? t("Next: {medicine} at {time}", {
                            medicine: next.medicine_name,
                            time: fmtTime(next.time),
                          })
                        : missed
                          ? t("{count} missed today", { count: missed })
                          : t("All done for today")}
                </span>
                {mine.length > 0 && (
                  <span class="hint">
                    {t("{taken} of {total} taken", { taken, total: mine.length })}
                  </span>
                )}
                <Icon name="chevronRight" class="person-go" />
              </button>
            );
          })}
        </div>
        {toastEl}
      </div>
    );
  }

  // ---------- One person's day ----------
  const doses = schedule.doses;
  const hero = isToday
    ? (doses.find((d) => d.due) ?? doses.find((d) => d.status === "pending"))
    : undefined;
  const rest = doses.filter((d) => d !== hero);
  const finished = isToday && doses.length > 0 && !doses.some((d) => d.status === "pending");
  const missedToday = doses.filter((d) => d.status === "missed").length;
  const allDone = finished && missedToday === 0;
  const who = caregiver ? profiles.find((p) => p.id === person)?.name : null;

  return (
    <div>
      {caregiver && (
        <button type="button" class="btn btn-secondary back-btn" onClick={() => openPerson(null)}>
          <Icon name="chevronLeft" />
          {t("Everyone")}
        </button>
      )}
      <h1>
        {who
          ? t("{name}'s medicines", { name: firstName(who) })
          : isToday
            ? t("Your medicines today")
            : t("Your medicines")}
      </h1>
      <p class="lead">
        {fmtDay(schedule.date, today)} · {fmtLongDate(schedule.date)}
      </p>
      {error && <ErrorNotice text={error} />}

      {hero && (
        <section aria-labelledby="next-title" class="hero">
          <h2 id="next-title">{hero.due ? t("Take this now") : t("Your next medicine")}</h2>
          <DoseCard
            dose={hero}
            today={today}
            timeZone={schedule.timezone}
            nowMinutes={nowMinutes}
            showPerson={false}
            busy={busy}
            big
            onMark={mark}
          />
        </section>
      )}

      {allDone && (
        <div class="all-done" role="status">
          <Icon name="check" class="icon-lg icon-taken" />
          <p>{t("All done for today. Well done!")}</p>
        </div>
      )}

      {finished && missedToday > 0 && (
        <div class="notice notice-warning" role="status">
          <Icon name="alert" />
          <span>
            {t("{count} medicine(s) were missed today. You can still mark them below if taken.", {
              count: missedToday,
            })}
          </span>
        </div>
      )}

      {doses.length === 0 && (
        <div class="empty card">
          <Icon name="leaf" />
          <p>{t("No medicines on this day.")}</p>
          {caregiver && person && (
            <a class="btn btn-primary" href={`/medicine?profile=${person}`}>
              <Icon name="plus" />
              {t("Add a medicine")}
            </a>
          )}
        </div>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="rest-title">
          <h2 id="rest-title" class="section-title">
            {isToday ? t("The rest of today") : t("Medicines on this day")}
          </h2>
          <div class="stack">
            {rest.map((d) => (
              <DoseCard
                key={`${d.medicine_id}-${d.time}`}
                dose={d}
                today={today}
                timeZone={schedule.timezone}
                nowMinutes={nowMinutes}
                showPerson={false}
                busy={busy}
                onMark={mark}
              />
            ))}
          </div>
        </section>
      )}

      <nav class="day-nav" aria-label={t("Other days")}>
        <h2 class="section-title">{t("Other days")}</h2>
        <div class="day-nav-row">
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => setDay(addDays(schedule.date, -1))}
          >
            <Icon name="chevronLeft" />
            {t("Day before")}
          </button>
          {!isToday && (
            <button type="button" class="btn btn-primary" onClick={() => setDay(null)}>
              {t("Back to today")}
            </button>
          )}
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => setDay(addDays(schedule.date, 1))}
          >
            {t("Day after")}
            <Icon name="chevronRight" />
          </button>
        </div>
      </nav>
      {toastEl}
    </div>
  );
}

function ErrorNotice({ text }: { text: string }) {
  return (
    <div class="notice notice-error" role="alert">
      <Icon name="alert" />
      <span>{text}</span>
    </div>
  );
}
