import { useState } from "preact/hooks";
import { useT } from "../lib/i18n";
import {
  disableReminders,
  enableReminders,
  type ReminderState,
  reminderState,
} from "../lib/notifications";
import { Icon } from "./Icon";

const TEXT: Record<ReminderState, string> = {
  on: "Reminders are on. You will get a message when a medicine is due, and one more 15 minutes later if it is still not marked. Keep PillPal open in a browser tab.",
  off: "Get a message on this device when it is time for a medicine.",
  blocked:
    "Messages are blocked for PillPal. Open your browser's settings for this site, allow notifications, then reload the page.",
  unsupported: "This browser can't show messages. You will still see reminders inside PillPal.",
};

export default function ReminderSettings() {
  const t = useT();
  const [state, setState] = useState<ReminderState>(reminderState());
  const [busy, setBusy] = useState(false);

  async function turnOn() {
    setBusy(true);
    setState(await enableReminders());
    setBusy(false);
  }

  return (
    <div class="card">
      <h3>{t("Reminders")}</h3>
      <p>{t(TEXT[state])}</p>
      {state === "off" && (
        <button type="button" class="btn btn-primary" disabled={busy} onClick={turnOn}>
          <Icon name="bell" />
          {t("Turn on reminders")}
        </button>
      )}
      {state === "on" && (
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() => setState(disableReminders())}
        >
          {t("Turn off reminders")}
        </button>
      )}
    </div>
  );
}
