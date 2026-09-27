import { useEffect, useState } from "preact/hooks";
import { supabase } from "../lib/supabase";
import { Icon } from "./Icon";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) location.href = "/today";
    });
  }, []);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    // Uncontrolled inputs: anything typed before the page finished loading is kept.
    const data = new FormData(e.currentTarget as HTMLFormElement);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "That email or password is not right. Please check and try again."
          : "We couldn't sign you in right now. Please try again in a moment.",
      );
      setBusy(false);
      return;
    }
    location.href = "/today";
  }

  return (
    <form onSubmit={submit} noValidate>
      {error && (
        <div class="notice notice-error" role="alert">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}
      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          autocomplete="email"
          inputMode="email"
          name="email"
          required
        />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          autocomplete="current-password"
          name="password"
          required
        />
      </div>
      <button class="btn btn-primary btn-block" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
