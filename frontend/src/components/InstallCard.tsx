import { useEffect, useState } from "preact/hooks";
import { useT } from "../lib/i18n";
import { Icon } from "./Icon";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep it for our own big, clearly labelled button
    deferred = e as InstallEvent;
  });
}

/** "Install PillPal on this phone": an icon on the home screen, full screen, no browser bars. */
export default function InstallCard() {
  const t = useT();
  const [canPrompt, setCanPrompt] = useState(!!deferred);
  const installed = matchMedia("(display-mode: standalone)").matches;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const on = () => setCanPrompt(true);
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);

  if (installed) return null;
  return (
    <div class="card">
      <h3>{t("Put PillPal on your home screen")}</h3>
      <p>{t("Open it like any other app, with one tap, in full screen.")}</p>
      {canPrompt ? (
        <button
          type="button"
          class="btn btn-primary"
          onClick={async () => {
            await deferred?.prompt();
            deferred = null;
            setCanPrompt(false);
          }}
        >
          <Icon name="plus" />
          {t("Install PillPal")}
        </button>
      ) : (
        <p class="hint">
          {ios
            ? t("On iPhone: tap the Share button, then 'Add to Home Screen'.")
            : t("In your browser menu, choose 'Install app' or 'Add to Home screen'.")}
        </p>
      )}
    </div>
  );
}
