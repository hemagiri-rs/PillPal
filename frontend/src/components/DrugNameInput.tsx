import { useEffect, useRef, useState } from "preact/hooks";
import { api, type DrugSuggestion } from "../lib/api";

interface Props {
  value: string;
  invalid: boolean;
  describedBy?: string;
  onChange: (name: string) => void;
  onPick: (s: DrugSuggestion) => void;
}

/** Accessible combobox (ARIA 1.2 pattern) with large suggestion rows. Free text always allowed. */
export function DrugNameInput({ value, invalid, describedBy, onChange, onPick }: Props) {
  const [items, setItems] = useState<DrugSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api<DrugSuggestion[]>(`/drugs/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => {
          setItems(r);
          setOpen(r.length > 0);
          setActive(-1);
        })
        .catch(() => setItems([])); // suggestions are optional; typing still works
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  function choose(s: DrugSuggestion) {
    skipNext.current = true; // don't re-search for the name we just picked
    onPick(s);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div class="combo">
      <input
        id="name"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="name-list"
        aria-activedescendant={active >= 0 ? `name-opt-${active}` : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        value={value}
        onInput={(e) => onChange(e.currentTarget.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => items.length > 0 && setOpen(true)}
      />
      {open && (
        <div id="name-list" role="listbox" class="combo-list" aria-label="Suggested medicines">
          {items.map((s, i) => (
            // ARIA combobox pattern: focus stays on the input (aria-activedescendant) and the
            // input handles the keys, so options are intentionally not focusable themselves.
            // biome-ignore lint/a11y/useFocusableInteractive: see above
            // biome-ignore lint/a11y/useKeyWithClickEvents: see above
            <div
              key={s.name}
              id={`name-opt-${i}`}
              role="option"
              aria-selected={i === active}
              class="combo-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
