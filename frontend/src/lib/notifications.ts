// Browser reminders (web). Fires while PillPal is open in any tab; a closed browser needs Web Push
// (out of scope). The Capacitor build will swap this for native local notifications later.
import type { Dose, Role } from "./api";
import { firstName, fmtTime } from "./format";

const ENABLED_KEY = "pillpal:reminders";
const SENT_KEY = "pillpal:notified";
export const FOLLOW_UP_MIN = 15;

export type ReminderState = "unsupported" | "blocked" | "off" | "on";

function store(key: string, value?: string): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {}
  return null;
}

export function reminderState(): ReminderState {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return Notification.permission === "granted" && store(ENABLED_KEY) === "on" ? "on" : "off";
}

/** Must be called from a click (browsers require a user gesture for the permission prompt). */
export async function enableReminders(): Promise<ReminderState> {
  if (reminderState() === "unsupported") return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  await navigator.serviceWorker.register("/sw.js");
  store(ENABLED_KEY, "on");
  await show("Reminders are on", "PillPal will remind you when a medicine is due.", "pillpal-test");
  return "on";
}

export function disableReminders(): ReminderState {
  store(ENABLED_KEY, "off");
  return reminderState();
}

async function show(title: string, body: string, tag: string) {
  const reg = await navigator.serviceWorker.getRegistration();
  const options = { body, tag, icon: "/favicon.svg", data: { url: "/today" } };
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Notify once when a dose becomes due, and once more if it is still unmarked FOLLOW_UP_MIN later.
 * `nowIso` is the family-local "now" from the API.
 */
export async function remindDue(doses: Dose[], nowIso: string, role: Role) {
  if (reminderState() !== "on") return;
  const today = nowIso.slice(0, 10);
  const now = minutesOf(nowIso.slice(11, 16));
  const sent = new Set<string>(
    JSON.parse(store(SENT_KEY) ?? "[]").filter((k: string) => k.includes(today)),
  );
  for (const d of doses) {
    if (!d.due || d.date !== today) continue;
    const late = now - minutesOf(d.time) >= FOLLOW_UP_MIN;
    const key = `${d.medicine_id}|${d.date}|${d.time}|${late ? "follow" : "due"}`;
    if (sent.has(key)) continue;
    sent.add(key);
    const who = role === "caregiver" ? `${firstName(d.profile_name)}: ` : "";
    const title = late
      ? `${who}${d.medicine_name} is still not marked`
      : `${who}time for ${d.medicine_name} ${d.strength}`;
    await show(title, `${d.instructions} (${fmtTime(d.time)})`, key);
  }
  store(SENT_KEY, JSON.stringify([...sent]));
}
