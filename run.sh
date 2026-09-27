#!/usr/bin/env bash
# PillPal — start the API and the web app from one command.
#
#   API  FastAPI served by granian   http://127.0.0.1:$API_PORT   (docs at /docs)
#   Web  Astro served by bun         http://localhost:$WEB_PORT
#
# Works on Linux/macOS and on Windows via Git Bash. For cmd/PowerShell use run.bat.
#
#   ./run.sh                  # both, with auto-reload
#   API_PORT=9000 ./run.sh    # different API port
#   WEB_PORT=4400 ./run.sh    # different web port
#   RELOAD=0 ./run.sh         # no auto-reload
#   LAN=1 ./run.sh            # also bind the web app to your LAN (for the phone demo)
#   FORCE=1 ./run.sh          # replace an astro dev server that is already running
#
# Ctrl+C stops both.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-4321}"
RELOAD="${RELOAD:-1}"

# ---- prerequisites -----------------------------------------------------------
missing=0
command -v uv >/dev/null 2>&1 || { echo "!!  'uv' not found. Install it from https://docs.astral.sh/uv/" >&2; missing=1; }
command -v bun >/dev/null 2>&1 || { echo "!!  'bun' not found. Install it from https://bun.sh/" >&2; missing=1; }
[ "$missing" -eq 0 ] || exit 1

if [ ! -f .env ]; then
  echo "!!  No .env found — copy .env.example to .env or sign-in will fail." >&2
fi

# ---- dependencies ------------------------------------------------------------
if [ ! -d backend/.venv ]; then
  echo "==> Backend dependencies missing, running 'uv sync'"
  (cd backend && uv sync)
fi

if [ ! -d frontend/node_modules ]; then
  # --no-save: install without writing a bun.lock, so npm/CI stay the source of truth.
  echo "==> Frontend dependencies missing, running 'bun install --no-save'"
  (cd frontend && bun install --no-save)
fi

# ---- start both --------------------------------------------------------------
pids=()

cleanup() {
  trap - INT TERM EXIT
  echo
  echo "==> Stopping PillPal"
  have_pkill=0
  command -v pkill >/dev/null 2>&1 && have_pkill=1
  for pid in "${pids[@]:-}"; do
    # Children first: 'bun run dev' spawns astro, which would otherwise be orphaned.
    [ "$have_pkill" -eq 1 ] && pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
  done
  sleep 1
  for pid in "${pids[@]:-}"; do
    [ "$have_pkill" -eq 1 ] && pkill -KILL -P "$pid" 2>/dev/null || true
    kill -KILL "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# granian takes the app as a positional argument and resolves it from the working
# directory, so run it from backend/.
(
  cd backend
  reload_flag="--no-reload"
  [ "$RELOAD" = "1" ] && reload_flag="--reload"
  exec uv run granian \
    --interface asgi \
    --host "$API_HOST" \
    --port "$API_PORT" \
    --log-level info \
    "$reload_flag" \
    app.main:app
) &
pids+=("$!")

(
  cd frontend
  # bun forwards these straight through to 'astro dev'.
  # (astro dev refuses to start if the project already has a dev server running;
  #  FORCE=1 replaces it, which is why it is opt-in rather than the default.)
  args=(--port "$WEB_PORT")
  [ "${LAN:-0}" = "1" ] && args+=(--host)
  [ "${FORCE:-0}" = "1" ] && args+=(--force)
  exec bun run dev "${args[@]}"
) &
pids+=("$!")

echo
echo "  API   http://$API_HOST:$API_PORT      docs at /docs"
echo "  Web   http://localhost:$WEB_PORT"
echo
echo "  Ctrl+C stops both."
echo

# Stay in the foreground until either side exits, then tear the other one down.
while kill -0 "${pids[0]}" 2>/dev/null && kill -0 "${pids[1]}" 2>/dev/null; do
  sleep 1
done

cleanup
