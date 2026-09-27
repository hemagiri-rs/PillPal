import { useMe } from "../lib/session";
import { Icon, type IconName } from "./Icon";

type Tab = "today" | "medicines" | "progress" | "family";

export default function NavBar({ active }: { active: Tab }) {
  const { me } = useMe();
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
                <Icon name={t.icon} />
                <span>{t.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
