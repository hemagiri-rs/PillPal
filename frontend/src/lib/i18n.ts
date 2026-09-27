// Live translation via the backend (Groq + DB cache), cached again in the browser.
// Usage in islands: const t = useT(); t("Time for {count} medicines", { count: 2 })
// In .astro markup: <span data-i18n>Text</span> (translated by translateStatic()).
import { useEffect, useState } from "preact/hooks";

export interface Lang {
  code: string;
  name: string; // English name
  native: string; // name in its own script
  rtl?: boolean;
}

// English + the 22 scheduled languages of India (must match backend app/languages.py)
export const LANGS: Lang[] = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "ur", name: "Urdu", native: "اردو", rtl: true },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "mai", name: "Maithili", native: "मैथिली" },
  { code: "sat", name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { code: "ks", name: "Kashmiri", native: "کٲشُر", rtl: true },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "kok", name: "Konkani", native: "कोंकणी" },
  { code: "sd", name: "Sindhi", native: "سنڌي", rtl: true },
  { code: "doi", name: "Dogri", native: "डोगरी" },
  { code: "mni", name: "Manipuri", native: "মৈতৈলোন্" },
  { code: "brx", name: "Bodo", native: "बड़ो" },
  { code: "sa", name: "Sanskrit", native: "संस्कृतम्" },
];

const LANG_KEY = "pillpal:lang";
const dictKey = (code: string) => `pillpal:dict:${code}`;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function hasChosenLang(): boolean {
  return read(LANG_KEY) !== null;
}

export function getLang(): Lang {
  const code = read(LANG_KEY) ?? "en";
  return LANGS.find((l) => l.code === code) ?? LANGS[0];
}

export function applyLangToDocument(lang = getLang()) {
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.rtl ? "rtl" : "ltr";
}

export function setLang(code: string, next?: string) {
  write(LANG_KEY, code);
  // read by the inline script in AppLayout before first paint
  write("pillpal:dir", LANGS.find((l) => l.code === code)?.rtl ? "rtl" : "ltr");
  // Full reload is the simplest way to re-render every island and static text in the new language
  if (next) location.href = next;
  else location.reload();
}

// ---- dictionary + batching ----
const lang = typeof window === "undefined" ? LANGS[0] : getLang();
const dict: Record<string, string> = JSON.parse(read(dictKey(lang.code)) ?? "{}");
const tried = new Set<string>(); // asked this page load (avoid re-asking when Groq falls back)
const pending = new Set<string>();
const listeners = new Set<() => void>();
let timer: number | undefined;

function request(text: string) {
  if (lang.code === "en" || text in dict || tried.has(text)) return;
  pending.add(text);
  tried.add(text);
  clearTimeout(timer);
  timer = window.setTimeout(flush, 40);
}

async function flush() {
  const texts = [...pending];
  pending.clear();
  if (!texts.length) return;
  const { post } = await import("./api"); // lazy: avoids an import cycle with api.ts
  for (let i = 0; i < texts.length; i += 300) {
    try {
      const { translations } = await post<{ translations: Record<string, string> }>("/translate", {
        lang: lang.code,
        texts: texts.slice(i, i + 300),
      });
      for (const [src, out] of Object.entries(translations)) if (out !== src) dict[src] = out;
    } catch {
      // offline / Groq down: English stays on screen
    }
  }
  write(dictKey(lang.code), JSON.stringify(dict));
  for (const fn of listeners) fn();
  translateStatic();
}

export type Vars = Record<string, string | number>;

export function t(text: string, vars?: Vars): string {
  request(text);
  let out = dict[text] ?? text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

/** Re-render this component when new translations arrive. */
export function useT(): typeof t {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return t;
}

/** Translate `data-i18n` elements in static .astro markup (keeps the English source in data-src). */
export function translateStatic() {
  if (lang.code === "en") return;
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    el.dataset.src ??= (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (el.dataset.src) el.textContent = t(el.dataset.src);
  }
}

/** Read text aloud in the chosen language where the device has a voice for it. */
export function speak(text: string) {
  if (!("speechSynthesis" in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang.code === "en" ? "en-IN" : `${lang.code}-IN`;
  u.rate = 0.9; // a little slower for older listeners
  speechSynthesis.speak(u);
  return true;
}
