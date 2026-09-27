"""Pre-translate every UI string into all languages: `uv run python -m app.prewarm [lang ...]`.

Collects t("...") calls and data-i18n text from the frontend source, plus the English-source
constants that are passed to t() by variable, and fills the translation cache so the first view of
any page in any language is instant. Safe to re-run: only missing strings are sent to Groq.
Groq's free tier allows ~8k tokens/min, so a full run takes several minutes (it waits on 429s).
"""

import re
import sys
from pathlib import Path

from sqlmodel import Session

from app.db import engine, init_db
from app.languages import LANGUAGES
from app.models import Medicine, Translation
from app.routers.translate import BATCH, cached, translate_batch

FRONTEND = Path(__file__).resolve().parents[2] / "frontend" / "src"

T_CALL = re.compile(r'\bt\(\s*"((?:[^"\\]|\\.)+)"')
DATA_I18N = re.compile(r"<[a-z0-9]+[^>]*\bdata-i18n\b[^>]*>(.*?)</", re.S)
# Constants holding English text that is translated later via t(variable)
CONST_BLOCK = re.compile(
    r"const (?:TEXT|STEP_TITLES|INSTRUCTION_PICKS|SERIES|TEXT_SIZES|INVITE_STATUS)\b[^=]*=\s*"
    r"([\[{].*?[\]}]);",
    re.S,
)
QUOTED = re.compile(r'"((?:[^"\\]|\\.)*[A-Za-z][^"\\]*(?:\\.[^"\\]*)*)"')
NOT_TEXT = re.compile(r"^(var\(|--|count-|[a-z]+$|\d{2}:\d{2}$)")


def ui_strings() -> list[str]:
    found: set[str] = set()
    for path in FRONTEND.rglob("*"):
        if path.suffix not in {".tsx", ".ts", ".astro"}:
            continue
        src = path.read_text(encoding="utf-8")
        found.update(m.replace('\\"', '"') for m in T_CALL.findall(src))
        found.update(" ".join(m.split()) for m in DATA_I18N.findall(src))
        for block in CONST_BLOCK.findall(src):
            found.update(q for q in QUOTED.findall(block) if " " in q or q[:1].isupper())
    return sorted(s for s in found if s.strip() and not NOT_TEXT.match(s))


def main() -> None:
    init_db()
    langs = sys.argv[1:] or [c for c in LANGUAGES if c != "en"]
    with Session(engine) as s:
        texts = ui_strings()
        texts += sorted({m.instructions for m in s.query(Medicine).all()} - set(texts))
        print(f"{len(texts)} strings x {len(langs)} languages")
        for lang in langs:
            missing = [x for x in texts if x not in cached(s, lang, texts)]
            done = 0
            for i in range(0, len(missing), BATCH):
                chunk = missing[i : i + BATCH]
                try:
                    fresh = translate_batch(lang, chunk, retries=6)
                except Exception as exc:  # keep going with the next language
                    print(f"  {lang}: batch failed ({type(exc).__name__}), will retry next run")
                    continue
                s.add_all(Translation(lang=lang, source=k, text=v) for k, v in fresh.items())
                s.commit()
                done += len(fresh)
            print(f"  {lang} ({LANGUAGES[lang][0]}): +{done}, {len(missing) - done} still missing")


if __name__ == "__main__":
    main()
