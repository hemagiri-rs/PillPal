import { useEffect, useState } from "preact/hooks";
import { type ApiError, api, post } from "../lib/api";
import { useT } from "../lib/i18n";
import { signOut } from "../lib/session";
import { supabase } from "../lib/supabase";
import { Icon } from "./Icon";

interface MyInvite {
  id: number;
  family_name: string;
  invited_by_name: string;
  label: string | null;
}

type Step = { kind: "choose" } | { kind: "join"; invite: MyInvite } | { kind: "start" };

/** First screen after sign-up: answer invitations, or start a new family. */
export default function WelcomeView() {
  const t = useT();
  const [invites, setInvites] = useState<MyInvite[] | null>(null);
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        location.href = "/login";
        return;
      }
      try {
        await api("/me"); // already in a family -> go home
        location.href = "/today";
      } catch (e) {
        if ((e as ApiError).status !== 403) setError((e as ApiError).message);
        setInvites(await api<MyInvite[]>("/invitations/mine").catch(() => []));
      }
    })();
  }, []);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      location.href = "/today";
    } catch (e) {
      const ae = e as ApiError;
      setError(t(ae.fields.name ?? ae.fields.family_name ?? ae.message));
      setBusy(false);
    }
  }

  async function decline(inv: MyInvite) {
    setBusy(true);
    try {
      await post(`/invitations/${inv.id}/decline`, {});
      setInvites((list) => (list ?? []).filter((i) => i.id !== inv.id));
    } catch (e) {
      setError(t((e as ApiError).message));
    } finally {
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

  if (step.kind === "join" || step.kind === "start") {
    const joining = step.kind === "join";
    return (
      <form
        class="card"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const person = {
            name: String(f.get("name") ?? "").trim(),
            date_of_birth: String(f.get("dob") ?? "") || null,
          };
          if (!person.name) {
            setError(t("Please enter your name."));
            return;
          }
          if (joining) {
            run(() => post(`/invitations/${step.invite.id}/accept`, person));
          } else {
            const family_name = String(f.get("family") ?? "").trim();
            if (!family_name) {
              setError(t("Please enter a name for your family."));
              return;
            }
            run(() =>
              post("/families", {
                ...person,
                family_name,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }),
            );
          }
        }}
      >
        <h1>
          {joining
            ? t("Join {family}", { family: step.invite.family_name })
            : t("Start your family")}
        </h1>
        {errorBox}
        {!joining && (
          <div class="field">
            <label for="family">{t("Family name")}</label>
            <input id="family" name="family" type="text" placeholder={t("e.g. Sharma Family")} />
          </div>
        )}
        <div class="field">
          <label for="name">{t("Your name")}</label>
          <input id="name" name="name" type="text" autocomplete="name" />
        </div>
        <div class="field">
          <label for="dob">{t("Date of birth (optional)")}</label>
          <input id="dob" name="dob" type="date" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-huge" disabled={busy}>
            {busy ? t("Please wait…") : joining ? t("Join the family") : t("Start my family")}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => {
              setError(null);
              setStep({ kind: "choose" });
            }}
          >
            {t("Back")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <h1>{t("Welcome to PillPal")}</h1>
      {errorBox}
      {invites.length > 0 && (
        <section aria-labelledby="inv-title" class="stack">
          <h2 id="inv-title">{t("You have been invited")}</h2>
          {invites.map((inv) => (
            <article key={inv.id} class="card invite-card">
              <Icon name="users" class="icon-lg" />
              <p class="invite-text">
                {t("{name} invited you to join the {family}.", {
                  name: inv.invited_by_name,
                  family: inv.family_name,
                })}
              </p>
              <div class="form-actions">
                <button
                  type="button"
                  class="btn btn-primary btn-huge"
                  disabled={busy}
                  onClick={() => setStep({ kind: "join", invite: inv })}
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
      )}

      <section class="card start-card" aria-labelledby="start-title">
        <h2 id="start-title">
          {invites.length ? t("Or start your own family") : t("Start your family")}
        </h2>
        <p>
          {t("You will look after the family's medicines and can invite others by their email.")}
        </p>
        <button
          type="button"
          class="btn btn-primary btn-huge btn-block"
          onClick={() => setStep({ kind: "start" })}
        >
          <Icon name="plus" />
          {t("Start my family")}
        </button>
      </section>

      <p class="hint center">
        {t("Waiting for an invitation? Ask your family to invite this email.")}{" "}
        <button type="button" class="link-btn" onClick={signOut}>
          {t("Sign out")}
        </button>
      </p>
    </div>
  );
}
