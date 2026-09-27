import { getLang, hasChosenLang, LANGS, setLang } from "../lib/i18n";

/** Big buttons, each language written in its own script, so anyone can find theirs. */
export default function LanguagePicker() {
  const current = hasChosenLang() ? getLang().code : null;
  const next = new URLSearchParams(location.search).get("next") ?? "/login";
  return (
    <ul class="lang-grid">
      {LANGS.map((l) => (
        <li key={l.code}>
          <button
            type="button"
            class="lang-btn"
            lang={l.code}
            dir={l.rtl ? "rtl" : "ltr"}
            aria-pressed={current === l.code}
            onClick={() => setLang(l.code, next)}
          >
            <span class="lang-native">{l.native}</span>
            {l.code !== "en" && <span class="lang-en">{l.name}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
