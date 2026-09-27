import { useEffect, useState } from "preact/hooks";
import { type ApiError, api, del, type Profile, patch, post } from "../lib/api";
import { parseDate } from "../lib/format";
import { signOut, useMe } from "../lib/session";
import { Icon } from "./Icon";
import ReminderSettings from "./ReminderSettings";

type Draft = { name: string; date_of_birth: string; notes: string };
const EMPTY: Draft = { name: "", date_of_birth: "", notes: "" };
const TEXT_SIZES = [
  { id: "normal", label: "Normal" },
  { id: "large", label: "Large" },
  { id: "xlarge", label: "Extra large" },
];

function age(dob: string | null): string {
  if (!dob) return "";
  const b = parseDate(dob);
  const n = new Date();
  const years =
    n.getFullYear() -
    b.getFullYear() -
    (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
  return `Age ${years}`;
}

export default function FamilyView() {
  const { me } = useMe();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const reload = () =>
    api<Profile[]>("/profiles").then(setProfiles, (e: ApiError) => setError(e.message));
  useEffect(() => {
    if (me) reload();
  }, [me]);

  if (!me || !profiles) return <p aria-live="polite">Loading…</p>;
  const caregiver = me.role === "caregiver";

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
      setFieldError("Please enter a name.");
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
      setError((e as ApiError).message);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await del(`/profiles/${deleting.id}`);
      setDeleting(null);
      await reload();
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  const form = (
    <form class="card" onSubmit={save} noValidate>
      <h2>{editing === "new" ? "Add a person" : "Edit person"}</h2>
      <div class="field">
        <label for="p-name">Name</label>
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
        <label for="p-dob">Date of birth (optional)</label>
        <input
          id="p-dob"
          type="date"
          value={draft.date_of_birth}
          onInput={(e) => setDraft({ ...draft, date_of_birth: e.currentTarget.value })}
        />
      </div>
      <div class="field">
        <label for="p-notes">Notes (optional)</label>
        <textarea
          id="p-notes"
          aria-describedby="p-notes-hint"
          value={draft.notes}
          onInput={(e) => setDraft({ ...draft, notes: e.currentTarget.value })}
        />
        <p class="hint" id="p-notes-hint">
          For example allergies or the doctor's name. Only your family can see this.
        </p>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit">
          Save
        </button>
        <button type="button" class="btn btn-secondary" onClick={() => setEditing(null)}>
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <div class="page-head">
        <h1>{caregiver ? "Family" : "Me"}</h1>
        {caregiver && editing === null && (
          <button type="button" class="btn btn-primary" onClick={() => startEdit(null)}>
            <Icon name="plus" />
            Add a person
          </button>
        )}
      </div>

      {error && (
        <div class="notice notice-error" role="alert">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}

      {deleting && (
        <div class="card" role="alertdialog" aria-labelledby="del-title">
          <h2 id="del-title">Remove {deleting.name}?</h2>
          <p>
            This deletes {deleting.name}'s profile, all their medicines and their dose history. This
            can't be undone.
          </p>
          <div class="form-actions">
            <button type="button" class="btn btn-danger" onClick={confirmDelete}>
              <Icon name="trash" />
              Yes, remove
            </button>
            <button type="button" class="btn btn-secondary" onClick={() => setDeleting(null)}>
              No, keep
            </button>
          </div>
        </div>
      )}

      {editing === "new" && form}

      <div class="stack">
        {profiles.map((p) =>
          editing === p.id ? (
            <div key={p.id}>{form}</div>
          ) : (
            <article key={p.id} class="card">
              <h2>{p.name}</h2>
              {p.date_of_birth && <p class="hint">{age(p.date_of_birth)}</p>}
              {p.notes && <p>{p.notes}</p>}
              <div class="form-actions">
                <a class="btn btn-secondary" href={`/progress?profile=${p.id}`}>
                  <Icon name="chart" />
                  Progress
                </a>
                {caregiver && (
                  <button type="button" class="btn btn-secondary" onClick={() => startEdit(p)}>
                    <Icon name="edit" />
                    Edit
                  </button>
                )}
                {caregiver && (
                  <button type="button" class="btn btn-danger" onClick={() => setDeleting(p)}>
                    <Icon name="trash" />
                    Remove
                  </button>
                )}
              </div>
            </article>
          ),
        )}
      </div>

      <h2 class="section-title">Settings</h2>
      <div class="stack">
        <TextSize />
        <ReminderSettings />
        <div class="card">
          <h3>Account</h3>
          <p class="hint">Signed in as {me.email}</p>
          <button type="button" class="btn btn-secondary" onClick={signOut}>
            <Icon name="logout" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function TextSize() {
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
      <legend class="card-legend">Text size</legend>
      {TEXT_SIZES.map((t) => (
        <button
          key={t.id}
          type="button"
          class="chip"
          aria-pressed={size === t.id}
          onClick={() => choose(t.id)}
        >
          {t.label}
        </button>
      ))}
    </fieldset>
  );
}
