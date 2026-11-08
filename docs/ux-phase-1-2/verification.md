# Local verification

Use a separate checkout, not production credentials. Install backend requirements plus pytest/httpx into a virtual environment, and run `npm ci` in `frontend/olympiad-frontend`.

## Backend regressions (PowerShell, repository root)

```powershell
$env:DATABASE_URL='sqlite:///./ux-suite.sqlite3'
$env:SECRET_KEY=[guid]::NewGuid().ToString()+[guid]::NewGuid().ToString()
$env:PYTHONPATH='backend'
$env:UX_ISOLATED_TESTS='1'
$env:STAGING_MODE='1'
$env:SMTP_HOST='127.0.0.1'
$env:SMTP_SERVER='127.0.0.1'
$env:RESEND_API_KEY=''
python -m pytest backend/tests -q
```

The test cleanup fixture refuses a non-SQLite or non-`ux-` database. Never supply a production DATABASE_URL.

## Frontend

From `frontend/olympiad-frontend` run `npm test` and `npm run build`.

## Browser harness

From the repository root, run `python staging/ux_browser_harness.py`. It always constructs a new loopback-only SQLite database, generates local credentials in memory, disables email adapters and scheduler startup, and exposes local-only fixture endpoints. Do not deploy or import this harness in the application.

In a separate frontend terminal:

```powershell
$env:REACT_APP_API_URL='http://127.0.0.1:8018'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5178
```

From `staging`, with playwright-cli available:

```text
playwright-cli -s=ux-implementation open http://127.0.0.1:5178
playwright-cli -s=ux-implementation run-code --filename=ux-public.js
playwright-cli -s=ux-implementation run-code --filename=ux-auth.js
```

Every authenticated scenario resets and cleans the isolated database in `finally`. Inspect the returned results: all `passed` values must be true and every cleanup must report `remaining: 0`. A CLI exit of zero alone does not prove all assertions passed. The ledger records IDs, never credentials. Screenshots and CLI outputs are ignored local artifacts. Stop the backend with Ctrl+C for its final cleanup and file removal.

The scripts deliberately do not read secrets from disk, accept production URLs, send campaigns, create accounts in production, or test external mail delivery.
