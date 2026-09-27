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
import { fmtLongDate, fmtTime, isoDate } from "../lib/format";
import { useT } from "../lib/i18n";
import { useMe } from "../lib/session";
import { DrugNameInput } from "./DrugNameInput";
import { Icon } from "./Icon";

// Stored in English (the source of truth, translated for display) so every language sees them.
const INSTRUCTION_PICKS = [
  "1 tablet after food",
  "1 tablet before food",
  "1 tablet at bedtime",
  "On an empty stomach",
];
const TIME_PICKS = ["08:00", "13:00", "20:00", "21:30"];

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
  pills_left: number | null;
  pills_per_dose: number;
}

type Step = 1 | 2 | 3 | 4;
const STEP_TITLES: Record<Step, string> = {
  1: "Who takes it?",
  2: "Which medicine?",
  3: "When to take it?",
  4: "Check and save",
};
// Which step to send the person back to for each server-side field error
const FIELD_STEP: Record<string, Step> = {
  profile_id: 1,
  name: 2,
  strength: 2,
  instructions: 2,
  times: 3,
  start_date: 3,
  end_date: 3,
  pills_left: 3,
  pills_per_dose: 3,
};

export default function MedicineForm() {
  const t = useT();
  const { me } = useMe();
  const params = new URLSearchParams(location.search);
  const editId = params.get("id");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [step, setStep] = useState<Step>(editId ? 2 : 1);
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
        setForm({ ...m, end_date: m.end_date ?? "", times: m.times.map((x) => x.slice(0, 5)) });
        return;
      }
      const pre = ps.find((p) => p.id === Number(params.get("profile")))?.id;
      const only = ps.length === 1 ? ps[0].id : undefined;
      setForm({
        profile_id: pre ?? only ?? "",
        name: "",
        rxterms_name: null,
        strength: "",
        instructions: "",
        start_date: isoDate(new Date()),
        end_date: "",
        active: true,
        times: ["08:00"],
        pills_left: null,
        pills_per_dose: 1,
      });
      if (pre ?? only) setStep(2);
    });
  }, [me]);

  if (!form) return <p aria-live="polite">{t("Loading…")}</p>;
  const f = form;
  const set = (p: Partial<FormState>) => setForm({ ...f, ...p });
  const person = profiles.find((p) => p.id === f.profile_id);
  const err = (field: string) =>
    errors[field] ? (
      <p class="field-error" id={`${field}-error`}>
        {t(errors[field])}
      </p>
    ) : null;

  function check(s: Step): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 1 && f.profile_id === "") e.profile_id = "Please choose who takes this medicine.";
    if (s === 2) {
      if (!f.name.trim()) e.name = "Please enter the medicine name.";
      if (!f.strength.trim()) e.strength = "Please enter the strength, for example 500 mg.";
      if (!f.instructions.trim()) e.instructions = "Please say how to take it.";
    }
    if (s === 3) {
      if (f.times.some((x) => !x)) e.times = "Please fill in every time, or remove it.";
      if (new Set(f.times).size !== f.times.length)
        e.times = "The same time is listed twice. Remove the duplicate time.";
      if (f.end_date && f.end_date < f.start_date)
        e.end_date = "The end date can't be before the start date.";
      if (f.pills_left !== null && !(Number.isInteger(f.pills_left) && f.pills_left >= 0))
        e.pills_left = "Please enter a whole number, or leave it empty.";
      if (!(Number.isInteger(f.pills_per_dose) && f.pills_per_dose >= 1 && f.pills_per_dose <= 20))
        e.pills_per_dose = "Please enter a number from 1 to 20.";
    }
    return e;
  }

  function next() {
    const e = check(step);
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length === 0 && step < 4) {
      setStep((step + 1) as Step);
      window.scrollTo({ top: 0 });
    }
  }

  function back() {
    setErrors({});
    if (step > (editId ? 2 : 1)) setStep((step - 1) as Step);
    else location.href = "/medicines";
  }

  async function save() {
    setSaving(true);
    setFormError(null);
    try {
      const body = { ...f, end_date: f.end_date || null };
      const saved = editId
        ? await patch<Medicine>(`/medicines/${editId}`, body)
        : await post<Medicine>("/medicines", body);
      if (saved.warnings.length) setWarnings(saved.warnings);
      else location.href = "/medicines";
    } catch (e) {
      const ae = e as ApiError;
      setErrors(ae.fields);
      setFormError(t(ae.fields.form ?? ae.message));
      const firstField = Object.keys(ae.fields).find((k) => FIELD_STEP[k]);
      // A duplicate medicine (409) is about the name/strength: show it on step 2
      setStep(firstField ? FIELD_STEP[firstField] : ae.status === 409 ? 2 : 4);
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0 });
    }
  }

  async function remove() {
    try {
      await del(`/medicines/${editId}`);
      location.href = "/medicines";
    } catch (e) {
      setFormError(t((e as ApiError).message));
      setConfirmDelete(false);
    }
  }

  // ---------- after save: timing warning ----------
  if (warnings.length) {
    return (
      <div>
        <h1>{t("Medicine saved")}</h1>
        <div class="notice notice-warning" role="status">
          <Icon name="alert" />
          <div>
            <strong>{t("Please check the timing:")}</strong>
            <ul>
              {warnings.map((w) => (
                <li key={w}>{t(w)}</li>
              ))}
            </ul>
            <p>{t("If you are not sure these can be taken close together, ask a pharmacist.")}</p>
          </div>
        </div>
        <div class="form-actions">
          <a class="btn btn-primary" href="/medicines">
            {t("OK")}
          </a>
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => {
              setWarnings([]);
              setStep(3);
            }}
          >
            {t("Change the times")}
          </button>
        </div>
      </div>
    );
  }

  // ---------- delete confirmation ----------
  if (confirmDelete) {
    return (
      <div class="card">
        <h1>{t("Delete this medicine?")}</h1>
        <p>
          {t(
            "{medicine} for {name} will be deleted, with its history of taken doses. This can't be undone.",
            { medicine: `${f.name} ${f.strength}`, name: person?.name ?? "" },
          )}
        </p>
        <p class="hint">{t('If they have only stopped for now, untick "Still taking" instead.')}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-danger" onClick={remove}>
            <Icon name="trash" />
            {t("Yes, delete it")}
          </button>
          <button type="button" class="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
            {t("No, keep it")}
          </button>
        </div>
      </div>
    );
  }

  const firstStep = editId ? 2 : 1;
  const stepCount = editId ? 3 : 4;
  const stepNumber = step - firstStep + 1;

  return (
    <div>
      <p class="step-count">
        {editId ? t("Edit medicine") : t("Add a medicine")} ·{" "}
        {t("Step {n} of {total}", { n: stepNumber, total: stepCount })}
      </p>
      <div class="step-bar" aria-hidden="true">
        <span style={{ width: `${(stepNumber / stepCount) * 100}%` }} />
      </div>
      <h1>{t(STEP_TITLES[step])}</h1>

      {formError && (
        <div class="notice notice-error" role="alert">
          <Icon name="alert" />
          <span>{formError}</span>
        </div>
      )}

      {step === 1 && (
        <fieldset class="field choice-list">
          <legend class="sr-only">{t("Who takes it?")}</legend>
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              class="choice"
              aria-pressed={f.profile_id === p.id}
              onClick={() => {
                set({ profile_id: p.id });
                setErrors({});
              }}
            >
              <Icon name={f.profile_id === p.id ? "check" : "users"} class="choice-icon" />
              {p.name}
            </button>
          ))}
          {err("profile_id")}
        </fieldset>
      )}

      {step === 2 && (
        <>
          <div class="field">
            <label for="name">{t("Medicine name")}</label>
            <p class="hint" id="name-hint">
              {t("Start typing and pick from the list, or type any name.")}
            </p>
            <DrugNameInput
              value={f.name}
              invalid={!!errors.name}
              describedBy={errors.name ? "name-hint name-error" : "name-hint"}
              onChange={(name) => set({ name, rxterms_name: null })}
              onPick={(s: DrugSuggestion) => {
                set({ name: cleanDrugName(s.name), rxterms_name: s.name, strength: "" });
                setStrengths(s.strengths);
              }}
            />
            {err("name")}
          </div>
          <div class="field">
            <label for="strength">{t("Strength")}</label>
            {strengths.length > 0 && (
              <fieldset class="pick-row">
                <legend class="sr-only">{t("Common strengths")}</legend>
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
              placeholder={t("e.g. 500 mg")}
              value={f.strength}
              aria-invalid={!!errors.strength}
              aria-describedby={errors.strength ? "strength-error" : undefined}
              onInput={(e) => set({ strength: e.currentTarget.value })}
            />
            {err("strength")}
          </div>
          <div class="field">
            <label for="instructions">{t("How to take it")}</label>
            <fieldset class="pick-row">
              <legend class="sr-only">{t("Common instructions")}</legend>
              {INSTRUCTION_PICKS.map((s) => (
                <button
                  key={s}
                  type="button"
                  class="chip"
                  aria-pressed={f.instructions === s}
                  onClick={() => set({ instructions: s })}
                >
                  {t(s)}
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
        </>
      )}

      {step === 3 && (
        <>
          <fieldset class="field">
            <legend>{t("Times of day")}</legend>
            {f.times.map((x, i) => (
              <div class="time-row" key={i}>
                <label class="sr-only" for={`time-${i}`}>
                  {t("Time {n}", { n: i + 1 })}
                </label>
                <input
                  id={`time-${i}`}
                  type="time"
                  value={x}
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
                    {t("Remove")}
                  </button>
                )}
              </div>
            ))}
            {err("times")}
            {f.times.length < 8 && (
              <div class="pick-row">
                {TIME_PICKS.filter((p) => !f.times.includes(p)).map((p) => (
                  <button
                    key={p}
                    type="button"
                    class="chip"
                    onClick={() => set({ times: [...f.times, p].sort() })}
                  >
                    <Icon name="plus" /> {fmtTime(p)}
                  </button>
                ))}
                <button type="button" class="chip" onClick={() => set({ times: [...f.times, ""] })}>
                  <Icon name="plus" /> {t("Other time")}
                </button>
              </div>
            )}
          </fieldset>
          <div class="field">
            <label for="start">{t("Start date")}</label>
            <input
              id="start"
              type="date"
              value={f.start_date}
              onInput={(e) => set({ start_date: e.currentTarget.value })}
            />
          </div>
          <div class="field">
            <label for="end">{t("End date (optional)")}</label>
            <input
              id="end"
              type="date"
              min={f.start_date}
              value={f.end_date}
              aria-describedby="end-hint"
              onInput={(e) => set({ end_date: e.currentTarget.value })}
            />
            <p class="hint" id="end-hint">
              {t("Leave empty if it is ongoing.")}
            </p>
            {err("end_date")}
          </div>
          <div class="field-row">
            <div class="field">
              <label for="per-dose">{t("Tablets each time")}</label>
              <input
                id="per-dose"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={f.pills_per_dose}
                onInput={(e) => set({ pills_per_dose: Number(e.currentTarget.value) || 1 })}
              />
              {err("pills_per_dose")}
            </div>
            <div class="field">
              <label for="pills-left">{t("Tablets you have now (optional)")}</label>
              <input
                id="pills-left"
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                value={f.pills_left ?? ""}
                aria-describedby="pills-hint"
                onInput={(e) =>
                  set({
                    pills_left: e.currentTarget.value === "" ? null : Number(e.currentTarget.value),
                  })
                }
              />
              <p class="hint" id="pills-hint">
                {t("We will remind you before they run out.")}
              </p>
              {err("pills_left")}
            </div>
          </div>
        </>
      )}

      {step === 4 && (
        <div class="card review">
          <dl>
            <dt>{t("Who")}</dt>
            <dd>{person?.name}</dd>
            <dt>{t("Medicine")}</dt>
            <dd>
              {f.name} {f.strength}
            </dd>
            <dt>{t("How")}</dt>
            <dd>{t(f.instructions)}</dd>
            <dt>{t("When")}</dt>
            <dd>{f.times.map(fmtTime).join(", ")}</dd>
            <dt>{t("Tablets")}</dt>
            <dd>
              {t("{n} each time", { n: f.pills_per_dose })}
              {f.pills_left !== null && ` · ${t("{n} left", { n: f.pills_left })}`}
            </dd>
            <dt>{t("From")}</dt>
            <dd>
              {fmtLongDate(f.start_date)}
              {f.end_date ? ` → ${fmtLongDate(f.end_date)}` : ` · ${t("ongoing")}`}
            </dd>
          </dl>
          {editId && (
            <div class="field check-field">
              <input
                id="active"
                type="checkbox"
                checked={f.active}
                onChange={(e) => set({ active: e.currentTarget.checked })}
              />
              <label for="active">{t("Still taking")}</label>
            </div>
          )}
        </div>
      )}

      <div class="form-actions step-actions">
        {step < 4 ? (
          <button type="button" class="btn btn-primary btn-huge" onClick={next}>
            {t("Next")}
            <Icon name="chevronRight" />
          </button>
        ) : (
          <button type="button" class="btn btn-primary btn-huge" disabled={saving} onClick={save}>
            <Icon name="check" />
            {saving ? t("Saving…") : t("Save medicine")}
          </button>
        )}
        <button type="button" class="btn btn-secondary" onClick={back}>
          <Icon name="chevronLeft" />
          {step === firstStep ? t("Cancel") : t("Back")}
        </button>
      </div>

      {editId && step === 4 && (
        <button
          type="button"
          class="btn btn-danger delete-btn"
          onClick={() => setConfirmDelete(true)}
        >
          <Icon name="trash" />
          {t("Delete this medicine")}
        </button>
      )}
    </div>
  );
}
