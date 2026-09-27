import type { Dose } from "../lib/api";
import { fmtClock, fmtTime } from "../lib/format";
import { speak, useT } from "../lib/i18n";
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

type T = ReturnType<typeof useT>;

/** Plain-words status. Pending splits into "Due now" (its time has come) and "Later". */
export function statusInfo(
  dose: Dose,
  timeZone: string,
  t: T,
): { key: string; label: string; icon: IconName } {
  switch (dose.status) {
    case "taken":
      return {
        key: "taken",
        label: dose.marked_at
          ? t("Taken at {time}", { time: fmtClock(dose.marked_at, timeZone) })
          : t("Taken"),
        icon: "check",
      };
    case "skipped":
      return { key: "skipped", label: t("Not taken"), icon: "skip" };
    case "missed":
      return { key: "missed", label: t("Missed"), icon: "x" };
    default:
      return dose.due
        ? { key: "pending", label: t("Due now"), icon: "bell" }
        : { key: "pending", label: t("Later"), icon: "clock" };
  }
}

/** Translated instructions, with the caregiver's original English beneath (safety). */
export function Instructions({ text }: { text: string }) {
  const t = useT();
  const translated = t(text);
  return (
    <>
      <p class="dose-instructions">{translated}</p>
      {translated !== text && (
        <p class="original" lang="en" dir="ltr">
          {text}
        </p>
      )}
    </>
  );
}

export function SpeakButton({ dose }: { dose: Dose }) {
  const t = useT();
  if (!("speechSynthesis" in window)) return null;
  const words = `${dose.medicine_name} ${dose.strength}. ${t(dose.instructions)}. ${fmtTime(dose.time)}`;
  return (
    <button type="button" class="btn btn-secondary speak-btn" onClick={() => speak(words)}>
      <Icon name="speaker" />
      {t("Read aloud")}
    </button>
  );
}

interface Props {
  dose: Dose;
  today: string;
  timeZone: string;
  nowMinutes: number;
  showPerson: boolean;
  busy: boolean;
  big?: boolean; // the "Next medicine" hero card
  onMark: (dose: Dose, status: "taken" | "skipped" | "pending") => void;
}

export function DoseCard({
  dose,
  today,
  timeZone,
  nowMinutes,
  showPerson,
  busy,
  big,
  onMark,
}: Props) {
  const t = useT();
  const info = statusInfo(dose, timeZone, t);
  const tooEarly =
    dose.date > today || (dose.date === today && minutes(dose.time) - nowMinutes > EARLY_LIMIT_MIN);
  const open = dose.status === "pending" || dose.status === "missed";
  const what = `${dose.medicine_name} ${dose.strength}, ${dose.profile_name}, ${fmtTime(dose.time)}`;

  return (
    <article class={`dose dose-${info.key}${big ? " dose-big" : ""}`} aria-label={what}>
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
      <Instructions text={dose.instructions} />

      {open && !tooEarly && (
        <div class="dose-actions">
          <button
            type="button"
            class={`btn btn-primary btn-take${big ? " btn-huge" : ""}`}
            disabled={busy}
            onClick={() => onMark(dose, "taken")}
          >
            <Icon name="check" />
            {t("I took it")}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            disabled={busy}
            onClick={() => onMark(dose, "skipped")}
          >
            {t("Not taking it")}
          </button>
        </div>
      )}
      {open && tooEarly && (
        <p class="hint">
          {dose.date > today
            ? t("You can mark this on the day.")
            : t("You can mark this from {time}.", {
                time: fmtTime(fromMinutes(minutes(dose.time) - EARLY_LIMIT_MIN)),
              })}
        </p>
      )}
      {(!open || big) && (
        <div class="dose-foot">
          {!open && (
            <button
              type="button"
              class="btn btn-secondary"
              disabled={busy}
              onClick={() => onMark(dose, "pending")}
            >
              <Icon name="undo" />
              {t("Undo")}
            </button>
          )}
          {big && <SpeakButton dose={dose} />}
        </div>
      )}
    </article>
  );
}
