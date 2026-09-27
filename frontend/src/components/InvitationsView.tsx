import { useEffect, useState } from "preact/hooks";
import { api, type Profile } from "../lib/api";
import { useT } from "../lib/i18n";
import { useMe } from "../lib/session";
import { Icon } from "./Icon";
import { InvitesPanel } from "./InvitesPanel";

/** Invitations tab: answer invitations after you are already signed in. */
export default function InvitationsView() {
  const t = useT();
  const { me } = useMe();
  const [count, setCount] = useState<number | null>(null);
  const [myName, setMyName] = useState("");

  useEffect(() => {
    if (me?.profile_id)
      api<Profile>(`/profiles/${me.profile_id}`).then(
        (p) => setMyName(p.name),
        () => {},
      );
  }, [me]);

  if (!me) return <p aria-live="polite">{t("Loading…")}</p>;
  return (
    <div>
      <h1>{t("Invitations")}</h1>
      {me.role === "member" && (
        <p class="lead">
          {t("If you join another family, you will leave {family}.", { family: me.family_name })}
        </p>
      )}
      <InvitesPanel onCount={setCount} defaultName={myName} />
      {count === 0 && (
        <div class="empty card">
          <Icon name="users" class="icon-lg" />
          <p>{t("No invitations right now.")}</p>
          {me.role === "caregiver" && (
            <a class="btn btn-primary" href="/family">
              {t("Invite someone to your family")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
