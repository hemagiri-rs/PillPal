import { useEffect, useState } from "preact/hooks";
import { type ApiError, api, del, type Profile, patch, post } from "../lib/api";
import { parseDate } from "../lib/format";
import { getLang, useT } from "../lib/i18n";
import { signOut, useMe } from "../lib/session";
import { Icon, type IconName } from "./Icon";
import InstallCard from "./InstallCard";
import ReminderSettings from "./ReminderSettings";

type Draft = { name: string; date_of_birth: string; notes: string };
const EMPTY: Draft = { name: "", date_of_birth: "", notes: "" };

interface Invite {
  id: number;
  email: string;
  label: string | null;
  status: "pending" | "accepted" | "declined";
}

const INVITE_STATUS: Record<Invite["status"], { label: string; icon: IconName; cls: string }> = {
  pending: { label: "Invited, waiting for answer", icon: "clock", cls: "count-pending" },
  accepted: { label: "Joined", icon: "check", cls: "count-taken" },
  declined: { label: "Said no", icon: "x", cls: "count-skipped" },
};

function age(dob: string | null): number | null {
  if (!dob) return null;
  const b = parseDate(dob);
  const n = new Date();
  return (
    n.getFullYear() -
    b.getFullYear() -
    (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0)
  );
}

export default function FamilyView() {
  const t = useT();
  const { me } = useMe();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const caregiver = me?.role === "caregiver";

  const reload = async () => {
    try {
      setProfiles(await api<Profile[]>("/profiles"));
      if (caregiver) setInvites(await api<Invite[]>("/invitations"));
    } catch (e) {
      setError(t((e as ApiError).message));
    }
  };
  useEffect(() => {
    if (me) reload();
  }, [me]);

  if (!me || !profiles) return <p aria-live="polite">{t("Loading…")}</p>;

  function startEdit(p: Profile | null) {
    setFieldError(null);
    setEditing(p ? p.id : "new");
    setDraft(
      p ? { name: p.name, date_of_birth: p.date_of_birth ?? "", notes: p.notes ?? "" } : EMPTY,
    );
  }

  async function save(e: Event) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setFieldError(t("Please enter a name."));
      return;
    }
    const body = {
      name: draft.name.trim(),
      date_of_birth: draft.date_of_birth || null,
      notes: draft.notes.trim() || null,
    };
    try {
      if (editing === "new") await post("/profiles", body);
      else await patch(`/profiles/${editing}`, body);
      setEditing(null);
      await reload();
    } catch (e) {
      setError(t((e as ApiError).message));
    }
  }

  async function sendInvite(e: SubmitEvent) {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const email = String(f.get("email") ?? "").trim();
    if (!email) {
      setFieldError(t("Please enter their email."));
      return;
    }
    try {
      await post("/invitations", { email, label: String(f.get("label") ?? "") || null });
      setInviting(false);
      setFieldError(null);
      await reload();
    } catch (e) {
      const ae = e as ApiError;
      setFieldError(ae.fields.email ? t("Please enter a real email address.") : t(ae.message));
    }
  }

  async function cancelInvite(inv: Invite) {
    try {
      await del(`/invitations/${inv.id}`);
      await reload();
    } catch (e) {
      setError(t((e as ApiError).message));
    }
  }

  async function reinvite(inv: Invite) {
    try {
      await post("/invitations", { email: inv.email, label: inv.label });
      await reload();
    } catch (e) {
      setError(t((e as ApiError).message));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await del(`/profiles/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (e) {
      setError(t((e as ApiError).message));
    }
  }

  const personForm = (
    <form class="card" onSubmit={save} noValidate>
      <h2>{editing === "new" ? t("Add a person without a phone") : t("Edit person")}</h2>
      {editing === "new" && (
        <p class="hint">
          {t("For someone who won't use PillPal themselves. You will mark their medicines.")}
        </p>
      )}
      <div class="field">
        <label for="p-name">{t("Name")}</label>
        <input
          id="p-name"
          type="text"
          autocomplete="off"
          value={draft.name}
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? "p-name-error" : undefined}
          onInput={(e) => setDraft({ ...draft, name: e.currentTarget.value })}
        />
        {fieldError && (
          <p class="field-error" id="p-name-error">
            {fieldError}
          </p>
        )}
      </div>
      <div class="field">
        <label for="p-dob">{t("Date of birth (optional)")}</label>
        <input
          id="p-dob"
          type="date"
          value={draft.date_of_birth}
          onInput={(e) => setDraft({ ...draft, date_of_birth: e.currentTarget.value })}
        />
      </div>
      <div class="field">
        <label for="p-notes">{t("Notes (optional)")}</label>
        <textarea
          id="p-notes"
          aria-describedby="p-notes-hint"
          value={draft.notes}
          onInput={(e) => setDraft({ ...draft, notes: e.currentTarget.value })}
        />
        <p class="hint" id="p-notes-hint">
          {t("For example allergies or the doctor's name. Only your family can see this.")}
        </p>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit">
          {t("Save")}
        </button>
        <button type="button" class="btn btn-secondary" onClick={() => setEditing(null)}>
          {t("Cancel")}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <h1>{caregiver ? t("Family") : t("Settings")}</h1>

      {error && (
        <div class="notice notice-error" role="alert">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}

      {deleting && (
        <div class="card" role="alertdialog" aria-labelledby="del-title">
          <h2 id="del-title">{t("Remove {name}?", { name: deleting.name })}</h2>
          <p>
            {t(
              "This deletes their profile, all their medicines and their history. This can't be undone.",
            )}
          </p>
          <div class="form-actions">
            <button type="button" class="btn btn-danger" onClick={confirmDelete}>
              <Icon name="trash" />
              {t("Yes, remove")}
            </button>
            <button type="button" class="btn btn-secondary" onClick={() => setDeleting(null)}>
              {t("No, keep")}
            </button>
          </div>
        </div>
      )}

      {caregiver && (
        <section aria-labelledby="invite-title" class="card invite-box">
          <h2 id="invite-title">{t("Invite family")}</h2>
          <p>
            {t(
              "They will see your invitation when they sign in to PillPal with this email. Their reminders start after they say yes.",
            )}
          </p>
          {inviting ? (
            <form onSubmit={sendInvite} noValidate>
              <div class="field">
                <label for="inv-email">{t("Their email")}</label>
                <input
                  id="inv-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autocomplete="off"
                  aria-invalid={!!fieldError}
                  aria-describedby={fieldError ? "inv-error" : undefined}
                />
                {fieldError && (
                  <p class="field-error" id="inv-error">
                    {fieldError}
                  </p>
                )}
              </div>
              <div class="field">
                <label for="inv-label">{t("Who is this? (optional)")}</label>
                <input id="inv-label" name="label" type="text" placeholder={t("e.g. Grandpa")} />
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                  {t("Send invitation")}
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={() => {
                    setInviting(false);
                    setFieldError(null);
                  }}
                >
                  {t("Cancel")}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              class="btn btn-primary btn-block"
              onClick={() => {
                setFieldError(null);
                setInviting(true);
              }}
            >
              <Icon name="plus" />
              {t("Invite someone")}
            </button>
          )}

          {invites.length > 0 && (
            <ul class="invite-list">
              {invites.map((inv) => {
                const st = INVITE_STATUS[inv.status];
                return (
                  <li key={inv.id} class="invite-row">
                    <div>
                      <strong>{inv.label ?? inv.email}</strong>
                      {inv.label && <span class="hint"> · {inv.email}</span>}
                    </div>
                    <span class={`count ${st.cls}`}>
                      <Icon name={st.icon} />
                      {t(st.label)}
                    </span>
                    {inv.status === "pending" && (
                      <button
                        type="button"
                        class="btn btn-secondary"
                        onClick={() => cancelInvite(inv)}
                      >
                        {t("Cancel invitation")}
                      </button>
                    )}
                    {inv.status === "declined" && (
                      <button type="button" class="btn btn-secondary" onClick={() => reinvite(inv)}>
                        {t("Invite again")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {editing === "new" && personForm}

      <h2 class="section-title">{caregiver ? t("People") : t("About me")}</h2>
      <div class="stack">
        {profiles.map((p) =>
          editing === p.id ? (
            <div key={p.id}>{personForm}</div>
          ) : (
            <article key={p.id} class="card">
              <h3>{p.name}</h3>
              {age(p.date_of_birth) !== null && (
                <p class="hint">{t("Age {years}", { years: age(p.date_of_birth) ?? 0 })}</p>
              )}
              {p.notes && <p>{p.notes}</p>}
              <div class="form-actions">
                <a class="btn btn-secondary" href={`/today?person=${p.id}`}>
                  <Icon name="home" />
                  {t("Their day")}
                </a>
                {caregiver && (
                  <button type="button" class="btn btn-secondary" onClick={() => startEdit(p)}>
                    <Icon name="edit" />
                    {t("Edit")}
                  </button>
                )}
                {caregiver && p.id !== me.profile_id && (
                  <button type="button" class="btn btn-danger" onClick={() => setDeleting(p)}>
                    <Icon name="trash" />
                    {t("Remove")}
                  </button>
                )}
              </div>
            </article>
          ),
        )}
      </div>
      {caregiver && editing === null && (
        <button
          type="button"
          class="btn btn-secondary btn-block add-person"
          onClick={() => startEdit(null)}
        >
          <Icon name="plus" />
          {t("Add a person without a phone")}
        </button>
      )}

      <h2 class="section-title">{t("Settings")}</h2>
      <div class="stack">
        <div class="card">
          <h3>{t("Language")}</h3>
          <p>{getLang().native}</p>
          <a class="btn btn-secondary" href="/language?next=/family">
            {t("Change language")}
          </a>
        </div>
        <TextSize />
        <ReminderSettings />
        <InstallCard />
        <div class="card">
          <h3>{t("Account")}</h3>
          <p class="hint">{t("Signed in as {email}", { email: me.email })}</p>
          <button type="button" class="btn btn-secondary" onClick={signOut}>
            <Icon name="logout" />
            {t("Sign out")}
          </button>
        </div>
      </div>
    </div>
  );
}

const TEXT_SIZES = [
  { id: "normal", label: "Big" },
  { id: "large", label: "Bigger" },
  { id: "xlarge", label: "Biggest" },
];

function TextSize() {
  const t = useT();
  const [size, setSize] = useState(document.documentElement.dataset.textSize ?? "normal");
  function choose(id: string) {
    setSize(id);
    if (id === "normal") delete document.documentElement.dataset.textSize;
    else document.documentElement.dataset.textSize = id;
    try {
      localStorage.setItem("pillpal:text-size", id);
    } catch {}
  }
  return (
    <fieldset class="card pick-row">
      <legend class="card-legend">{t("Text size")}</legend>
      {TEXT_SIZES.map((s) => (
        <button
          key={s.id}
          type="button"
          class="chip"
          aria-pressed={size === s.id}
          onClick={() => choose(s.id)}
        >
          {t(s.label)}
        </button>
      ))}
    </fieldset>
  );
}
