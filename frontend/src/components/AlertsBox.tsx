import { useEffect, useState } from "preact/hooks";
import { type Alerts, api } from "../lib/api";
import { firstName } from "../lib/format";
import { useT } from "../lib/i18n";
import { Icon } from "./Icon";

/** "Needs attention" on Home: low adherence this week (caregiver) and medicines running out. */
export function AlertsBox({ caregiver }: { caregiver: boolean }) {
  const t = useT();
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  useEffect(() => {
    api<Alerts>("/alerts").then(setAlerts, () => {});
  }, []);
  if (!alerts) return null;
  const low = caregiver ? alerts.low_adherence : [];
  if (!low.length && !alerts.refills.length) return null;

  return (
    <section class="alerts" aria-labelledby="alerts-title">
      <h2 id="alerts-title">
        <Icon name="alert" class="icon-lg icon-warn" />
        {t("Needs attention")}
      </h2>
      <ul class="alert-list">
        {low.map((a) => (
          <li key={`low-${a.profile_id}`} class="alert-item">
            <p>
              {t("{name} took only {percent}% of medicines this week ({taken} of {due}).", {
                name: firstName(a.name),
                percent: a.percent,
                taken: a.taken,
                due: a.due,
              })}
            </p>
            <a class="btn btn-secondary" href={`/progress?profile=${a.profile_id}`}>
              {t("See why")}
            </a>
          </li>
        ))}
        {alerts.refills.map((r) => (
          <li key={`refill-${r.medicine_id}`} class="alert-item">
            <p>
              {r.days_left === 0
                ? t("{medicine} for {name} has run out. Please buy more.", {
                    medicine: `${r.name} ${r.strength}`,
                    name: firstName(r.profile_name),
                  })
                : t("{medicine} for {name} runs out in about {days} day(s) ({pills} left).", {
                    medicine: `${r.name} ${r.strength}`,
                    name: firstName(r.profile_name),
                    days: r.days_left,
                    pills: r.pills_left,
                  })}
            </p>
            {caregiver && (
              <a class="btn btn-secondary" href={`/medicines#med-${r.medicine_id}`}>
                {t("Refill")}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
