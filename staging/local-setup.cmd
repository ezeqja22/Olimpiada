@echo off
setlocal
cd /d "%~dp0.."
if not exist .venv\Scripts\python.exe (
  py -3.12 -m venv .venv
  if errorlevel 1 (
    echo Python 3.12 is required. Check: py -3.12 --version
    exit /b 1
  )
)
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt httpx
if errorlevel 1 exit /b 1
pushd frontend\olympiad-frontend
call npm ci
if errorlevel 1 (
  popd
  exit /b 1
)
popd
.venv\Scripts\python.exe staging\local.py init
if errorlevel 1 exit /b 1
.venv\Scripts\python.exe staging\local.py check
if errorlevel 1 exit /b 1
echo.
echo Done. Run staging\local-api.cmd and staging\local-frontend.cmd in SEPARATE CMD windows.
endlocal
