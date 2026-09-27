import { useEffect, useState } from "preact/hooks";
import { type ApiError, api, post } from "../lib/api";
import { useT } from "../lib/i18n";
import { signOut } from "../lib/session";
import { supabase } from "../lib/supabase";
import { Icon } from "./Icon";
import { InvitesPanel } from "./InvitesPanel";

/** First screen after sign-up: answer invitations, or start a new family. */
export default function WelcomeView() {
  const t = useT();
  const [ready, setReady] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);
  const [starting, setStarting] = useState(false);
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
        setReady(true);
      }
    })();
  }, []);

  async function start(e: SubmitEvent) {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const name = String(f.get("name") ?? "").trim();
    const family_name = String(f.get("family") ?? "").trim();
    if (!family_name) {
      setError(t("Please enter a name for your family."));
      return;
    }
    if (!name) {
      setError(t("Please enter your name."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await post("/families", {
        name,
        family_name,
        date_of_birth: String(f.get("dob") ?? "") || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      location.href = "/today";
    } catch (err) {
      const ae = err as ApiError;
      setError(t(ae.fields.name ?? ae.fields.family_name ?? ae.message));
      setBusy(false);
    }
  }

  if (!ready) return <p aria-live="polite">{t("Loading…")}</p>;

  const errorBox = error && (
    <div class="notice notice-error" role="alert">
      <Icon name="alert" />
      <span>{error}</span>
    </div>
  );

  if (starting) {
    return (
      <form class="card" noValidate onSubmit={start}>
        <h1>{t("Start your family")}</h1>
        {errorBox}
        <div class="field">
          <label for="family">{t("Family name")}</label>
          <input id="family" name="family" type="text" placeholder={t("e.g. Sharma Family")} />
        </div>
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
            {busy ? t("Please wait…") : t("Start my family")}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => {
              setError(null);
              setStarting(false);
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
      <InvitesPanel onCount={setInviteCount} />

      <section class="card start-card" aria-labelledby="start-title">
        <h2 id="start-title">
          {inviteCount ? t("Or start your own family") : t("Start your family")}
        </h2>
        <p>
          {t("You will look after the family's medicines and can invite others by their email.")}
        </p>
        <button
          type="button"
          class="btn btn-primary btn-huge btn-block"
          onClick={() => setStarting(true)}
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
