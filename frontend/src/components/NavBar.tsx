import { useEffect, useState } from "preact/hooks";
import { api, type Schedule } from "../lib/api";
import { useT } from "../lib/i18n";
import { remindDue } from "../lib/notifications";
import { useMe } from "../lib/session";
import { Icon, type IconName } from "./Icon";

type Tab = "today" | "medicines" | "progress" | "family";

export default function NavBar({ active }: { active: Tab }) {
  const t = useT();
  const { me } = useMe();
  const member = me?.role === "member";
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
    { id: "today", href: "/today", label: t("Home"), icon: "home" },
    {
      id: "medicines",
      href: "/medicines",
      label: member ? t("My medicines") : t("Medicines"),
      icon: "pill",
    },
    {
      id: "progress",
      href: "/progress",
      label: member ? t("How am I doing?") : t("Progress"),
      icon: "chart",
    },
    {
      id: "family",
      href: "/family",
      label: member ? t("Settings") : t("Family"),
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
          {tabs.map((tab) => (
            <li key={tab.id}>
              <a href={tab.href} aria-current={tab.id === active ? "page" : undefined}>
                <span class="tab-icon">
                  <Icon name={tab.icon} />
                  {tab.id === "today" && dueCount > 0 && (
                    <span class="tab-badge" aria-hidden="true">
                      {dueCount}
                    </span>
                  )}
                </span>
                <span>{tab.label}</span>
                {tab.id === "today" && dueCount > 0 && (
                  <span class="sr-only">
                    , {t("{count} medicine(s) due now", { count: dueCount })}
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
