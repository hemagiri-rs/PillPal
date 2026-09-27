import { useEffect, useState } from "preact/hooks";
import { type ApiError, api, post } from "../lib/api";
import { useT } from "../lib/i18n";
import { Icon } from "./Icon";

export interface MyInvite {
  id: number;
  family_name: string;
  invited_by_name: string;
  label: string | null;
}

/**
 * Pending invitations for the signed-in email, with "Yes, join" (asks for your name) and
 * "No, thanks". Used on Welcome (new accounts) and on the Invitations tab.
 */
export function InvitesPanel({
  onCount,
  defaultName = "",
}: {
  onCount?: (n: number) => void;
  defaultName?: string;
}) {
  const t = useT();
  const [invites, setInvites] = useState<MyInvite[] | null>(null);
  const [joining, setJoining] = useState<MyInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<MyInvite[]>("/invitations/mine").then(
      (list) => {
        setInvites(list);
        onCount?.(list.length);
      },
      () => setInvites([]),
    );
  }, []);

  async function decline(inv: MyInvite) {
    setBusy(true);
    setError(null);
    try {
      await post(`/invitations/${inv.id}/decline`, {});
      const rest = (invites ?? []).filter((i) => i.id !== inv.id);
      setInvites(rest);
      onCount?.(rest.length);
    } catch (e) {
      setError(t((e as ApiError).message));
    } finally {
      setBusy(false);
    }
  }

  async function accept(e: SubmitEvent) {
    e.preventDefault();
    if (!joining) return;
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const name = String(f.get("name") ?? "").trim();
    if (!name) {
      setError(t("Please enter your name."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await post(`/invitations/${joining.id}/accept`, {
        name,
        date_of_birth: String(f.get("dob") ?? "") || null,
      });
      location.href = "/today";
    } catch (err) {
      setError(t((err as ApiError).message));
      setBusy(false);
    }
  }

  if (!invites) return <p aria-live="polite">{t("Loading…")}</p>;

  const errorBox = error && (
    <div class="notice notice-error" role="alert">
      <Icon name="alert" />
      <span>{error}</span>
    </div>
  );

  if (joining) {
    return (
      <form class="card" onSubmit={accept} noValidate>
        <h2>{t("Join {family}", { family: joining.family_name })}</h2>
        {errorBox}
        <div class="field">
          <label for="join-name">{t("Your name")}</label>
          <input
            id="join-name"
            name="name"
            type="text"
            autocomplete="name"
            defaultValue={defaultName}
          />
        </div>
        <div class="field">
          <label for="join-dob">{t("Date of birth (optional)")}</label>
          <input id="join-dob" name="dob" type="date" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-huge" disabled={busy}>
            {busy ? t("Please wait…") : t("Join the family")}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => {
              setError(null);
              setJoining(null);
            }}
          >
            {t("Back")}
          </button>
        </div>
      </form>
    );
  }

  if (invites.length === 0) return null;

  return (
    <section aria-labelledby="inv-title" class="stack">
      <h2 id="inv-title">{t("You have been invited")}</h2>
      {errorBox}
      {invites.map((inv) => (
        <article key={inv.id} class="card invite-card">
          <Icon name="users" class="icon-lg" />
          <p class="invite-text">
            {t("{name} invited you to join the {family}.", {
              name: inv.invited_by_name,
              family: inv.family_name,
            })}
          </p>
          {inv.label && <p class="hint">{t("They call you: {label}", { label: inv.label })}</p>}
          <div class="form-actions">
            <button
              type="button"
              class="btn btn-primary btn-huge"
              disabled={busy}
              onClick={() => setJoining(inv)}
            >
              <Icon name="check" />
              {t("Yes, join")}
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              disabled={busy}
              onClick={() => decline(inv)}
            >
              {t("No, thanks")}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
