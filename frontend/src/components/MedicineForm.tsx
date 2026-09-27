import { useEffect, useState } from "preact/hooks";
import {
  type ApiError,
  api,
  type DrugSuggestion,
  del,
  type Medicine,
  type Profile,
  patch,
  post,
} from "../lib/api";
import { isoDate } from "../lib/format";
import { useMe } from "../lib/session";
import { DrugNameInput } from "./DrugNameInput";
import { Icon } from "./Icon";

const INSTRUCTION_PICKS = [
  "1 tablet after food",
  "1 tablet before food",
  "1 tablet at bedtime",
  "On an empty stomach",
];

/** "metFORMIN (Oral Pill)" -> "Metformin"; "glyBURIDE/metFORMIN (Oral Pill)" -> "Glyburide/Metformin" */
export function cleanDrugName(rx: string): string {
  return rx
    .split(" (")[0]
    .split("/")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("/");
}

interface FormState {
  profile_id: number | "";
  name: string;
  rxterms_name: string | null;
  strength: string;
  instructions: string;
  start_date: string;
  end_date: string;
  active: boolean;
  times: string[];
}

function blank(profileId: number | ""): FormState {
  return {
    profile_id: profileId,
    name: "",
    rxterms_name: null,
    strength: "",
    instructions: "",
    start_date: isoDate(new Date()),
    end_date: "",
    active: true,
    times: ["08:00"],
  };
}

export default function MedicineForm() {
  const { me } = useMe();
  const params = new URLSearchParams(location.search);
  const editId = params.get("id");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!me) return;
    if (me.role !== "caregiver") {
      location.href = "/medicines";
      return;
    }
    api<Profile[]>("/profiles").then(async (ps) => {
      setProfiles(ps);
      if (editId) {
        const m = await api<Medicine>(`/medicines/${editId}`);
        setForm({
          ...m,
          end_date: m.end_date ?? "",
          times: m.times.map((t) => t.slice(0, 5)),
        });
      } else {
        const pre = Number(params.get("profile"));
        setForm(blank(ps.find((p) => p.id === pre)?.id ?? (ps.length === 1 ? ps[0].id : "")));
      }
    });
  }, [me]);

  if (!form) return <p aria-live="polite">Loading…</p>;
  const f = form;
  const set = (patchState: Partial<FormState>) => setForm({ ...f, ...patchState });
  const err = (field: string) =>
    errors[field] ? (
      <p class="field-error" id={`${field}-error`}>
        {errors[field]}
      </p>
    ) : null;
  const person = profiles.find((p) => p.id === f.profile_id);

  function pick(s: DrugSuggestion) {
    set({ name: cleanDrugName(s.name), rxterms_name: s.name, strength: "" });
    setStrengths(s.strengths);
  }

  async function save(e: Event) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (f.profile_id === "") local.profile_id = "Please choose who takes this medicine.";
    if (!f.name.trim()) local.name = "Please enter the medicine name.";
    if (!f.strength.trim()) local.strength = "Please enter the strength, for example 500 mg.";
    if (!f.instructions.trim()) local.instructions = "Please say how to take it.";
    if (f.times.some((t) => !t)) local.times = "Please fill in every time, or remove it.";
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length) return;

    const body = { ...f, end_date: f.end_date || null };
    setSaving(true);
    try {
      const saved = editId
        ? await patch<Medicine>(`/medicines/${editId}`, body)
        : await post<Medicine>("/medicines", body);
      if (saved.warnings.length) {
        setWarnings(saved.warnings);
        window.scrollTo({ top: 0 });
      } else {
        location.href = "/medicines";
      }
    } catch (e) {
      const ae = e as ApiError;
      setErrors(ae.fields);
      setFormError(ae.fields.form ?? ae.message);
      window.scrollTo({ top: 0 });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await del(`/medicines/${editId}`);
      location.href = "/medicines";
    } catch (e) {
      setFormError((e as ApiError).message);
      setConfirmDelete(false);
    }
  }

  if (warnings.length) {
    return (
      <div>
        <h1>Medicine saved</h1>
        <div class="notice notice-warning" role="status">
          <Icon name="alert" />
          <div>
            <strong>Please check the timing:</strong>
            <ul>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p>If you're not sure these can be taken close together, ask a pharmacist.</p>
          </div>
        </div>
        <div class="form-actions">
          <a class="btn btn-primary" href="/medicines">
            OK, go to medicines
          </a>
          <button type="button" class="btn btn-secondary" onClick={() => setWarnings([])}>
            Change the times
          </button>
        </div>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div class="card">
        <h1>Delete this medicine?</h1>
        <p>
          <strong>
            {f.name} {f.strength}
          </strong>{" "}
          for {person?.name} will be deleted, including its history of taken and skipped doses. This
          can't be undone.
        </p>
        <p class="hint">If they have only stopped for now, untick "Still taking" instead.</p>
        <div class="form-actions">
          <button type="button" class="btn btn-danger" onClick={remove}>
            <Icon name="trash" />
            Yes, delete it
          </button>
          <button type="button" class="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
            No, keep it
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} noValidate>
      <h1>{editId ? "Edit medicine" : "Add a medicine"}</h1>

      {formError && (
        <div class="notice notice-error" role="alert">
          <Icon name="alert" />
          <span>{formError}</span>
        </div>
      )}

      <div class="field">
        <label for="profile">Who takes it?</label>
        <select
          id="profile"
          value={f.profile_id}
          aria-invalid={!!errors.profile_id}
          aria-describedby={errors.profile_id ? "profile_id-error" : undefined}
          onChange={(e) =>
            set({ profile_id: e.currentTarget.value ? Number(e.currentTarget.value) : "" })
          }
          disabled={!!editId}
        >
          <option value="">Choose a person</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {err("profile_id")}
      </div>

      <div class="field">
        <label for="name">Medicine name</label>
        <p class="hint" id="name-hint">
          Start typing and pick from the list, or type any name.
        </p>
        <DrugNameInput
          value={f.name}
          invalid={!!errors.name}
          describedBy={errors.name ? "name-hint name-error" : "name-hint"}
          onChange={(name) => set({ name, rxterms_name: null })}
          onPick={pick}
        />
        {err("name")}
      </div>

      <div class="field">
        <label for="strength">Strength</label>
        {strengths.length > 0 && (
          <fieldset class="pick-row">
            <legend class="sr-only">Common strengths</legend>
            {strengths.map((s) => (
              <button
                key={s}
                type="button"
                class="chip"
                aria-pressed={f.strength === s}
                onClick={() => set({ strength: s })}
              >
                {s}
              </button>
            ))}
          </fieldset>
        )}
        <input
          id="strength"
          type="text"
          placeholder="e.g. 500 mg"
          value={f.strength}
          aria-invalid={!!errors.strength}
          aria-describedby={errors.strength ? "strength-error" : undefined}
          onInput={(e) => set({ strength: e.currentTarget.value })}
        />
        {err("strength")}
      </div>

      <div class="field">
        <label for="instructions">How to take it</label>
        <fieldset class="pick-row">
          <legend class="sr-only">Common instructions</legend>
          {INSTRUCTION_PICKS.map((s) => (
            <button
              key={s}
              type="button"
              class="chip"
              aria-pressed={f.instructions === s}
              onClick={() => set({ instructions: s })}
            >
              {s}
            </button>
          ))}
        </fieldset>
        <input
          id="instructions"
          type="text"
          value={f.instructions}
          aria-invalid={!!errors.instructions}
          aria-describedby={errors.instructions ? "instructions-error" : undefined}
          onInput={(e) => set({ instructions: e.currentTarget.value })}
        />
        {err("instructions")}
      </div>

      <fieldset class="field">
        <legend>Times to take it</legend>
        {f.times.map((t, i) => (
          <div class="time-row" key={i}>
            <label class="sr-only" for={`time-${i}`}>
              Time {i + 1}
            </label>
            <input
              id={`time-${i}`}
              type="time"
              value={t}
              aria-invalid={!!errors.times}
              onInput={(e) => {
                const times = [...f.times];
                times[i] = e.currentTarget.value;
                set({ times });
              }}
            />
            {f.times.length > 1 && (
              <button
                type="button"
                class="btn btn-secondary"
                onClick={() => set({ times: f.times.filter((_, j) => j !== i) })}
              >
                <Icon name="x" />
                Remove
              </button>
            )}
          </div>
        ))}
        {err("times")}
        {f.times.length < 8 && (
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => set({ times: [...f.times, ""] })}
          >
            <Icon name="plus" />
            Add another time
          </button>
        )}
      </fieldset>

      <div class="field-row">
        <div class="field">
          <label for="start">Start date</label>
          <input
            id="start"
            type="date"
            value={f.start_date}
            onInput={(e) => set({ start_date: e.currentTarget.value })}
          />
          {err("start_date")}
        </div>
        <div class="field">
          <label for="end">End date (optional)</label>
          <input
            id="end"
            type="date"
            min={f.start_date}
            value={f.end_date}
            aria-describedby="end-hint"
            onInput={(e) => set({ end_date: e.currentTarget.value })}
          />
          <p class="hint" id="end-hint">
            Leave empty if it's ongoing.
          </p>
          {err("end_date")}
        </div>
      </div>

      {editId && (
        <div class="field check-field">
          <input
            id="active"
            type="checkbox"
            checked={f.active}
            onChange={(e) => set({ active: e.currentTarget.checked })}
          />
          <label for="active">Still taking this medicine</label>
        </div>
      )}

      <div class="form-actions">
        <button class="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save medicine"}
        </button>
        <a class="btn btn-secondary" href="/medicines">
          Cancel
        </a>
      </div>

      {editId && (
        <button
          type="button"
          class="btn btn-danger delete-btn"
          onClick={() => setConfirmDelete(true)}
        >
          <Icon name="trash" />
          Delete this medicine
        </button>
      )}
    </form>
  );
}
