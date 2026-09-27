import { useEffect, useState } from "preact/hooks";
import { api, type Schedule } from "../lib/api";
import { getLang, useT } from "../lib/i18n";
import { remindDue } from "../lib/notifications";
import { useMe } from "../lib/session";
import { Icon, type IconName } from "./Icon";

type Tab = "today" | "medicines" | "progress" | "invitations" | "family";

export default function NavBar({ active }: { active: Tab }) {
  const t = useT();
  const { me } = useMe();
  const member = me?.role === "member";
  const [dueCount, setDueCount] = useState(0);
  const [inviteCount, setInviteCount] = useState(0);

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
    const checkInvites = () =>
      api<unknown[]>("/invitations/mine").then(
        (l) => setInviteCount(l.length),
        () => {},
      );
    check();
    checkInvites();
    const id = setInterval(() => {
      check();
      checkInvites();
    }, 60_000);
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
    { id: "invitations", href: "/invitations", label: t("Invites"), icon: "mail" },
    {
      id: "family",
      href: "/family",
      label: member ? t("Settings") : t("Family"),
      icon: "users",
    },
  ];

  const badge = (id: Tab) => (id === "today" ? dueCount : id === "invitations" ? inviteCount : 0);

  return (
    <header class="topbar">
      <a class="brand" href="/today">
        <Icon name="leaf" />
        <span>PillPal</span>
      </a>
      {me && <span class="family-name">{me.family_name}</span>}
      <a
        class="lang-switch"
        href={`/language?next=${encodeURIComponent(location.pathname + location.search)}`}
        aria-label={t("Change language")}
      >
        <Icon name="globe" class="lang-switch-icon" />
        <span lang={getLang().code}>{getLang().native}</span>
      </a>
      <nav aria-label="Main">
        <ul class="tabs">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <a href={tab.href} aria-current={tab.id === active ? "page" : undefined}>
                <span class="tab-icon">
                  <Icon name={tab.icon} />
                  {badge(tab.id) > 0 && (
                    <span class="tab-badge" aria-hidden="true">
                      {badge(tab.id)}
                    </span>
                  )}
                </span>
                <span>{tab.label}</span>
                {tab.id === "today" && dueCount > 0 && (
                  <span class="sr-only">
                    , {t("{count} medicine(s) due now", { count: dueCount })}
                  </span>
                )}
                {tab.id === "invitations" && inviteCount > 0 && (
                  <span class="sr-only">
                    , {t("{count} new invitation(s)", { count: inviteCount })}
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
