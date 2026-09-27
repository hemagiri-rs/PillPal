@echo off
REM PillPal - start the API and the web app from one command (Windows).
REM
REM   API  FastAPI served by granian   http://127.0.0.1:%API_PORT%   (docs at /docs)
REM   Web  Astro served by bun         http://localhost:%WEB_PORT%
REM
REM Opens one window per process. Close them (or press Ctrl+C in each) to stop.
REM
REM   run.bat                    both, with auto-reload
REM   set API_PORT=9000 && run.bat
REM   set WEB_PORT=4400 && run.bat
REM   set RELOAD=0 && run.bat    no auto-reload
REM   set FORCE=1  && run.bat    replace a running astro dev server

setlocal

set "ROOT=%~dp0"
if "%API_HOST%"=="" set "API_HOST=127.0.0.1"
if "%API_PORT%"=="" set "API_PORT=8000"
if "%WEB_PORT%"=="" set "WEB_PORT=4321"
if "%RELOAD%"==""   set "RELOAD=1"

REM ---- prerequisites --------------------------------------------------------
where uv >nul 2>nul
if errorlevel 1 (
  echo !!  'uv' not found. Install it from https://docs.astral.sh/uv/
  exit /b 1
)
where bun >nul 2>nul
if errorlevel 1 (
  echo !!  'bun' not found. Install it from https://bun.sh/
  exit /b 1
)

if not exist "%ROOT%.env" echo !!  No .env found - copy .env.example to .env or sign-in will fail.

REM ---- dependencies ---------------------------------------------------------
if not exist "%ROOT%backend\.venv" (
  echo ==^> Backend dependencies missing, running "uv sync"
  pushd "%ROOT%backend" && call uv sync && popd
)

if not exist "%ROOT%frontend\node_modules" (
  echo ==^> Frontend dependencies missing, running "bun install --no-save"
  pushd "%ROOT%frontend" && call bun install --no-save && popd
)

REM ---- start both -----------------------------------------------------------
set "RELOAD_FLAG=--reload"
if "%RELOAD%"=="0" set "RELOAD_FLAG=--no-reload"

set "WEB_FLAGS=--port %WEB_PORT%"
if "%FORCE%"=="1" set "WEB_FLAGS=--port %WEB_PORT% --force"

REM /D sets the working directory, which keeps the quoting simple: granian takes
REM the app as a positional argument and resolves it from the working directory.
start "PillPal API (granian)" /D "%ROOT%backend" cmd /k "uv run granian --interface asgi --host %API_HOST% --port %API_PORT% --log-level info %RELOAD_FLAG% app.main:app"
start "PillPal Web (bun)" /D "%ROOT%frontend" cmd /k "bun run dev %WEB_FLAGS%"

echo.
echo   API   http://%API_HOST%:%API_PORT%      docs at /docs
echo   Web   http://localhost:%WEB_PORT%
echo.
echo   Two windows opened. Close them to stop PillPal.
echo.

endlocal
