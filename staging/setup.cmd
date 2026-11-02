@echo off
setlocal
cd /d "%~dp0.."
where docker >nul 2>&1
if errorlevel 1 (
  echo Docker Desktop is required. Install it before trying staging.
  exit /b 1
)
where py >nul 2>&1
if errorlevel 1 (
  echo Python launcher is required to generate local-only credentials.
  exit /b 1
)
if not exist .env.staging (
  py -c "import secrets,pathlib; pathlib.Path('.env.staging').write_text('STAGING_DB_PASSWORD='+secrets.token_urlsafe(24)+'\nSTAGING_SECRET_KEY='+secrets.token_urlsafe(48)+'\n',encoding='utf-8')"
)
docker compose --env-file .env.staging -f staging\compose.yaml up -d --build
if errorlevel 1 (
  echo Staging failed to start.
  echo Inspect logs: docker compose --env-file .env.staging -f staging\compose.yaml logs --tail=100
  exit /b 1
)
echo.
echo Creating synthetic demo accounts (only on first launch)...
docker compose --env-file .env.staging -f staging\compose.yaml exec -T api python staging/seed_demo.py
echo.
echo Staging UI: http://localhost:5174/homepage
echo Backend API: http://localhost:8001/docs
echo Test emails: http://localhost:8025
echo All services are isolated from your production database.
endlocal
