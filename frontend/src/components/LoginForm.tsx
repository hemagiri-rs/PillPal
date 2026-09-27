import { useEffect, useState } from "preact/hooks";
import { useT } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { Icon } from "./Icon";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const t = useT();
  const [mode, setMode] = useState<Mode>(
    new URLSearchParams(location.search).get("mode") === "signup" ? "signup" : "signin",
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) location.href = "/today";
    });
  }, []);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const data = new FormData(e.currentTarget as HTMLFormElement);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (!email || !password) {
      setError(t("Please enter your email and password."));
      return;
    }
    if (mode === "signup") {
      if (password.length < 8) {
        setError(t("Please choose a password with at least 8 letters or numbers."));
        return;
      }
      if (password !== String(data.get("confirm") ?? "")) {
        setError(t("The two passwords are not the same. Please type them again."));
        return;
      }
    }
    setBusy(true);
    const res =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (res.error) {
      const msg = res.error.message;
      setError(
        msg === "Invalid login credentials"
          ? t("That email or password is not right. Please check and try again.")
          : /already registered/i.test(msg)
            ? t("This email already has an account. Please sign in instead.")
            : t("We couldn't do that right now. Please try again in a moment."),
      );
      return;
    }
    if (!res.data.session) {
      // Supabase "Confirm email" is on: they must click the link first.
      setInfo(t("Almost done! We sent you an email. Open it and tap the link, then sign in here."));
      setMode("signin");
      return;
    }
    location.href = mode === "signup" ? "/welcome" : "/today";
  }

  const signup = mode === "signup";
  return (
    <div>
      <div class="mode-switch" role="tablist" aria-label={t("Sign in or create account")}>
        <button
          type="button"
          role="tab"
          aria-selected={!signup}
          class="mode-tab"
          onClick={() => setMode("signin")}
        >
          {t("Sign in")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={signup}
          class="mode-tab"
          onClick={() => setMode("signup")}
        >
          {t("Create account")}
        </button>
      </div>

      <form onSubmit={submit} noValidate>
        {error && (
          <div class="notice notice-error" role="alert">
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div class="notice notice-info" role="status">
            <Icon name="info" />
            <span>{info}</span>
          </div>
        )}
        <div class="field">
          <label for="email">{t("Email")}</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            inputMode="email"
            required
          />
        </div>
        <div class="field">
          <label for="password">{t("Password")}</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete={signup ? "new-password" : "current-password"}
            required
          />
          {signup && <p class="hint">{t("At least 8 letters or numbers.")}</p>}
        </div>
        {signup && (
          <div class="field">
            <label for="confirm">{t("Type the password again")}</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autocomplete="new-password"
              required
            />
          </div>
        )}
        <button class="btn btn-primary btn-block btn-huge" type="submit" disabled={busy}>
          {busy ? t("Please wait…") : signup ? t("Create my account") : t("Sign in")}
        </button>
      </form>
      <p class="lang-link">
        <a href={`/language?next=${encodeURIComponent(location.pathname + location.search)}`}>
          {t("Change language")}
        </a>
      </p>
    </div>
  );
}
