import { useEffect, useState } from "preact/hooks";
import { api, type Schedule } from "../lib/api";
import { remindDue } from "../lib/notifications";
import { useMe } from "../lib/session";
import { Icon, type IconName } from "./Icon";

type Tab = "today" | "medicines" | "progress" | "family";

export default function NavBar({ active }: { active: Tab }) {
  const { me } = useMe();
  const [dueCount, setDueCount] = useState(0);

  // Every page watches today's schedule: badge on the Today tab + browser reminders.
  useEffect(() => {
    if (!me) return;
    const check = () =>
      api<Schedule>("/schedule")
        .then((s) => {
          setDueCount(s.doses.filter((d) => d.due).length);
          return remindDue(s.doses, s.now, me.role);
        })
        .catch(() => {}); // the page itself shows connection errors
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [me]);
  const tabs: { id: Tab; href: string; label: string; icon: IconName }[] = [
    { id: "today", href: "/today", label: "Today", icon: "today" },
    { id: "medicines", href: "/medicines", label: "Medicines", icon: "pill" },
    { id: "progress", href: "/progress", label: "Progress", icon: "chart" },
    {
      id: "family",
      href: "/family",
      label: me?.role === "member" ? "Me" : "Family",
      icon: "users",
    },
  ];
  return (
    <header class="topbar">
      <a class="brand" href="/today">
        <Icon name="leaf" />
        <span>PillPal</span>
      </a>
      {me && <span class="family-name">{me.family_name}</span>}
      <nav aria-label="Main">
        <ul class="tabs">
          {tabs.map((t) => (
            <li key={t.id}>
              <a href={t.href} aria-current={t.id === active ? "page" : undefined}>
                <span class="tab-icon">
                  <Icon name={t.icon} />
                  {t.id === "today" && dueCount > 0 && (
                    <span class="tab-badge" aria-hidden="true">
                      {dueCount}
                    </span>
                  )}
                </span>
                <span>{t.label}</span>
                {t.id === "today" && dueCount > 0 && (
                  <span class="sr-only">
                    , {dueCount} {dueCount === 1 ? "medicine" : "medicines"} due now
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
