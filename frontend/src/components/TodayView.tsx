import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { type ApiError, api, type Dose, type Profile, post, type Schedule } from "../lib/api";
import { addDays, firstName, fmtDay, fmtLongDate, fmtTime } from "../lib/format";
import { useMe } from "../lib/session";
import { DoseCard, minutes } from "./DoseCard";
import { Icon } from "./Icon";

const REFRESH_MS = 60_000;
const UNDO_MS = 10_000;

interface Toast {
  text: string;
  dose: Dose;
}

export default function TodayView() {
  const { me, error: meError } = useMe();
  const [day, setDay] = useState<string | null>(null); // null = family's today
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [person, setPerson] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number>();

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (day) q.set("date", day);
    try {
      const s = await api<Schedule>(`/schedule?${q}`);
      setSchedule(s);
      if (!day) setToday(s.date);
      setError(null);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }, [day]);

  useEffect(() => {
    if (!me) return;
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [me, load]);

  useEffect(() => {
    if (me?.role === "caregiver") api<Profile[]>("/profiles").then(setProfiles, () => {});
  }, [me]);

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
        const who = me?.role === "caregiver" ? ` for ${firstName(dose.profile_name)}` : "";
        setToast({
          text: `${dose.medicine_name} marked as ${status}${who}.`,
          dose,
        });
        toastTimer.current = window.setTimeout(() => setToast(null), UNDO_MS);
      }
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  if (meError) return <ErrorNotice text={meError} />;
  if (!me || !schedule || !today) return <p aria-live="polite">Loading your medicines…</p>;

  const shown = schedule.doses.filter((d) => person === null || d.profile_id === person);
  const nowMinutes = minutes(schedule.now.slice(11, 16));
  const isToday = schedule.date === today;
  const due = isToday ? shown.filter((d) => d.due) : [];
  const counted = shown.filter((d) => d.status !== "pending");
  const takenCount = shown.filter((d) => d.status === "taken").length;
  const groups = groupByTime(shown);
  const caregiver = me.role === "caregiver";

  return (
    <div>
      <div class="day-head">
        <h1>{fmtDay(schedule.date, today)}</h1>
        <p class="hint day-date">{fmtLongDate(schedule.date)}</p>
      </div>
      <nav class="day-nav" aria-label="Choose day">
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() => setDay(addDays(schedule.date, -1))}
        >
          <Icon name="chevronLeft" />
          Previous day
        </button>
        {!isToday && (
          <button type="button" class="btn btn-secondary" onClick={() => setDay(null)}>
            Back to today
          </button>
        )}
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() => setDay(addDays(schedule.date, 1))}
        >
          Next day
          <Icon name="chevronRight" />
        </button>
      </nav>

      {error && <ErrorNotice text={error} />}

      {due.length > 0 && (
        <div class="due-banner" role="status">
          <Icon name="bell" />
          <div>
            <strong>
              Time for {due.length === 1 ? "1 medicine" : `${due.length} medicines`} now
            </strong>
            <p>
              {due
                .map((d) =>
                  caregiver
                    ? `${firstName(d.profile_name)}: ${d.medicine_name}`
                    : `${d.medicine_name} ${d.strength}`,
                )
                .join(" · ")}
            </p>
          </div>
        </div>
      )}

      {caregiver && profiles.length > 1 && (
        <fieldset class="person-filter">
          <legend>Show medicines for</legend>
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

      {shown.length === 0 ? (
        <div class="empty card">
          <Icon name="leaf" />
          <p>No medicines on this day.</p>
          {caregiver && (
            <a class="btn btn-primary" href="/medicine">
              <Icon name="plus" />
              Add a medicine
            </a>
          )}
        </div>
      ) : (
        <>
          {counted.length > 0 && (
            <p class="progress-line">
              <strong>{takenCount}</strong> of <strong>{counted.length}</strong> due doses taken
              {isToday ? " so far today" : ""}.
            </p>
          )}
          {groups.map(([time, doses]) => (
            <section key={time} class="time-group" aria-labelledby={`t-${time}`}>
              <h2 id={`t-${time}`} class="time-heading">
                {fmtTime(time)}
              </h2>
              <div class="stack">
                {doses.map((d) => (
                  <DoseCard
                    key={`${d.medicine_id}-${d.time}`}
                    dose={d}
                    today={today}
                    timeZone={schedule.timezone}
                    nowMinutes={nowMinutes}
                    showPerson={caregiver}
                    busy={busy}
                    onMark={mark}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

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
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function groupByTime(doses: Dose[]): [string, Dose[]][] {
  const map = new Map<string, Dose[]>();
  for (const d of doses) map.set(d.time, [...(map.get(d.time) ?? []), d]);
  return [...map.entries()];
}

function ErrorNotice({ text }: { text: string }) {
  return (
    <div class="notice notice-error" role="alert">
      <Icon name="alert" />
      <span>{text}</span>
    </div>
  );
}
