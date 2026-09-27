import type { Dose } from "../lib/api";
import { fmtTime } from "../lib/format";
import { Icon, type IconName } from "./Icon";

const EARLY_LIMIT_MIN = 60; // backend allows marking up to 1 h early

export function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const m = (total + 1440) % 1440;
  return `${Math.floor(m / 60)}:${m % 60}`;
}

/** "8:05 PM" for an ISO timestamp, in the family's timezone (not the browser's). */
function clockIn(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

/** Visual status: pending splits into "due" (time has come) and "upcoming". */
export function statusInfo(
  dose: Dose,
  timeZone: string,
): { key: string; label: string; icon: IconName } {
  switch (dose.status) {
    case "taken":
      return {
        key: "taken",
        label: dose.marked_at ? `Taken at ${clockIn(dose.marked_at, timeZone)}` : "Taken",
        icon: "check",
      };
    case "skipped":
      return { key: "skipped", label: "Skipped", icon: "skip" };
    case "missed":
      return { key: "missed", label: "Missed", icon: "x" };
    default:
      return dose.due
        ? { key: "pending", label: "Due now", icon: "bell" }
        : { key: "pending", label: "Upcoming", icon: "clock" };
  }
}

interface Props {
  dose: Dose;
  today: string;
  timeZone: string;
  nowMinutes: number;
  showPerson: boolean;
  busy: boolean;
  onMark: (dose: Dose, status: "taken" | "skipped" | "pending") => void;
}

export function DoseCard({ dose, today, timeZone, nowMinutes, showPerson, busy, onMark }: Props) {
  const info = statusInfo(dose, timeZone);
  const tooEarly =
    dose.date > today || (dose.date === today && minutes(dose.time) - nowMinutes > EARLY_LIMIT_MIN);
  const open = dose.status === "pending" || dose.status === "missed";
  const what = `${dose.medicine_name} ${dose.strength} for ${dose.profile_name} at ${fmtTime(dose.time)}`;

  return (
    <article class={`dose dose-${info.key}`} aria-label={what}>
      <div class="dose-head">
        <span class={`status-badge badge-${info.key}`}>
          <span class="badge-dot">
            <Icon name={info.icon} />
          </span>
          {info.label}
        </span>
        <span class="dose-time">{fmtTime(dose.time)}</span>
      </div>
      {showPerson && <p class="dose-person">{dose.profile_name}</p>}
      <h3 class="dose-name">
        {dose.medicine_name} <span class="dose-strength">{dose.strength}</span>
      </h3>
      <p class="dose-instructions">{dose.instructions}</p>

      {open && !tooEarly && (
        <div class="dose-actions">
          <button
            type="button"
            class="btn btn-primary btn-take"
            disabled={busy}
            onClick={() => onMark(dose, "taken")}
          >
            <Icon name="check" />
            Taken
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            disabled={busy}
            onClick={() => onMark(dose, "skipped")}
          >
            <Icon name="skip" />
            Skip
          </button>
        </div>
      )}
      {open && tooEarly && (
        <p class="hint">
          {dose.date > today
            ? "You can mark this dose on the day."
            : `You can mark this from ${fmtTime(fromMinutes(minutes(dose.time) - EARLY_LIMIT_MIN))}.`}
        </p>
      )}
      {!open && (
        <div class="dose-actions">
          <button
            type="button"
            class="btn btn-secondary"
            disabled={busy}
            onClick={() => onMark(dose, "pending")}
          >
            <Icon name="undo" />
            Undo
          </button>
        </div>
      )}
    </article>
  );
}
