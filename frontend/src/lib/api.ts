import { supabase } from "./supabase";

const API = import.meta.env.PUBLIC_API_URL;

export type Role = "caregiver" | "member";
export type DoseStatus = "taken" | "skipped" | "pending" | "missed";

export interface Me {
  id: string;
  email: string;
  role: Role;
  family_id: number;
  family_name: string;
  timezone: string;
  profile_id: number | null;
}

export interface Profile {
  id: number;
  name: string;
  date_of_birth: string | null;
  notes: string | null;
}

export interface Medicine {
  id: number;
  profile_id: number;
  name: string;
  strength: string;
  rxterms_name: string | null;
  instructions: string;
  start_date: string;
  end_date: string | null;
  active: boolean;
  times: string[]; // "HH:MM:SS"
  warnings: string[];
}

export interface Dose {
  medicine_id: number;
  medicine_name: string;
  strength: string;
  instructions: string;
  profile_id: number;
  profile_name: string;
  date: string;
  time: string;
  status: DoseStatus;
  due: boolean;
  marked_at: string | null;
}

export interface Schedule {
  date: string;
  timezone: string;
  now: string;
  doses: Dose[];
}

export interface Counts {
  taken: number;
  skipped: number;
  missed: number;
  pending: number;
  percent: number | null;
}

export interface Adherence {
  start: string;
  end: string;
  overall: Counts;
  days: (Counts & { date: string })[];
  medicines: (Counts & {
    medicine_id: number;
    name: string;
    strength: string;
    profile_name: string;
  })[];
  streak_days: number;
}

export interface DrugSuggestion {
  name: string;
  strengths: string[];
}

export interface Summary {
  summary: string;
  source: "ai" | "rules";
}

/** An API error with a message that is safe and friendly to show, plus per-field errors. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const FRIENDLY: Record<string, string> = {
  missing: "Please fill this in.",
  string_too_short: "Please fill this in.",
  too_short: "Please add at least one.",
  date_from_datetime_parsing: "Please choose a valid date.",
  time_parsing: "Please choose a valid time.",
};

function parseError(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string") return new ApiError(detail, status);
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{loc: ["body", "name"], msg, type}]
    const fields: Record<string, string> = {};
    for (const e of detail as { loc: (string | number)[]; msg: string; type: string }[]) {
      // loc is e.g. ["body", "times", 0] or ["name"]; whole-form errors have no field name
      const field = e.loc.find((x) => typeof x === "string" && x !== "body") ?? "form";
      fields[field] ??= FRIENDLY[e.type] ?? e.msg.replace(/^Value error, /, "");
    }
    return new ApiError("Please check the highlighted fields.", status, fields);
  }
  return new ApiError("Something went wrong. Please try again.", status);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError("Can't reach PillPal. Check your internet connection and try again.", 0);
  }
  if (res.status === 401) {
    await supabase.auth.signOut();
    location.href = "/login";
    throw new ApiError("Please sign in again.", 401);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw parseError(res.status, body);
  return body as T;
}

export const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const del = (path: string) => api<void>(path, { method: "DELETE" });
