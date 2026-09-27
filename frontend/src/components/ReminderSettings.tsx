import { useState } from "preact/hooks";
import {
  disableReminders,
  enableReminders,
  type ReminderState,
  reminderState,
} from "../lib/notifications";
import { Icon } from "./Icon";

const TEXT: Record<ReminderState, string> = {
  on: "Reminders are on. You'll get a notification when a medicine is due, and one more if it's still not marked 15 minutes later. Keep PillPal open in a browser tab.",
  off: "Get a notification on this device when a medicine is due.",
  blocked:
    "Notifications are blocked for PillPal. To turn them on, open your browser's site settings for this page and allow notifications, then reload.",
  unsupported: "This browser can't show notifications. You'll still see reminders inside PillPal.",
};

export default function ReminderSettings() {
  const [state, setState] = useState<ReminderState>(reminderState());
  const [busy, setBusy] = useState(false);

  async function turnOn() {
    setBusy(true);
    setState(await enableReminders());
    setBusy(false);
  }

  return (
    <div class="card">
      <h3>Reminders</h3>
      <p>{TEXT[state]}</p>
      {state === "off" && (
        <button type="button" class="btn btn-primary" disabled={busy} onClick={turnOn}>
          <Icon name="bell" />
          Turn on reminders
        </button>
      )}
      {state === "on" && (
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() => setState(disableReminders())}
        >
          Turn off reminders
        </button>
      )}
    </div>
  );
}
