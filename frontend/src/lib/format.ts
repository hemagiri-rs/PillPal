// Friendly, localised formats for older users: "8:00 PM", "Today", "Mon 28 Sep".
import { getLang, t } from "./i18n";

function locale(): string {
  const code = typeof window === "undefined" ? "en" : getLang().code;
  return code === "en" ? "en-IN" : `${code}-IN`;
}

/** "20:00:00" | "20:00" -> "8:00 pm" in the chosen language */
export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(locale(), {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Parse "YYYY-MM-DD" as a local calendar date (no timezone shift). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** Relative to `today` (the family's date from the API): "Today", "Yesterday", "Mon 28 Sep" */
export function fmtDay(iso: string, today: string): string {
  if (iso === today) return t("Today");
  if (iso === addDays(today, -1)) return t("Yesterday");
  if (iso === addDays(today, 1)) return t("Tomorrow");
  return parseDate(iso).toLocaleDateString(locale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function fmtWeekday(iso: string): string {
  return parseDate(iso).toLocaleDateString(locale(), { weekday: "short" });
}

export function fmtLongDate(iso: string): string {
  return parseDate(iso).toLocaleDateString(locale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Clock time of an ISO timestamp in a given IANA timezone (the family's, not the browser's). */
export function fmtClock(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString(locale(), {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

export function firstName(name: string): string {
  return name.split(" ")[0];
}
