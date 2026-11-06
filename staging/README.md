# Local staging for testing (Windows)

The stage uses fresh Docker volumes for PostgreSQL and private files; it does not touch the current website or its database.

**Security warning:** This localhost-only Docker stage uses password-authenticated PostgreSQL with a randomly generated test password. The database port is not published on the host. Never use real identity documents, payment evidence, or user credentials in this synthetic stage; an online environment needs additional TLS and private storage review.

Install Docker Desktop and Python 3.12, then open CMD at repository root:

    git fetch origin
    git switch staging-validation
    git pull origin staging-validation
    staging\setup.cmd

The setup command generates random staging-only secrets in an ignored file named .env.staging.

Addresses:
- Homepage: http://localhost:5174/homepage
- Backend Swagger: http://localhost:8001/docs
- Test email inbox (Mailpit): http://localhost:8025

Only loopback ports are exposed to the host. No real outbound email provider is configured.
Private documents persist in a local Docker volume. The scheduled job runs only on isolated staging.

Stop the stage without removing records:

    docker compose --env-file .env.staging -f staging\compose.yaml down

Delete ALL local staging data only (this cannot be undone):

    docker compose --env-file .env.staging -f staging\compose.yaml down -v

Inspect errors:

    docker compose --env-file .env.staging -f staging\compose.yaml logs --tail=100

Do not copy production database URLs, credentials or personal records into this stage.

Online staging will additionally require a separate FastAPI deployment + managed PostgreSQL and private storage; this Docker setup does not create a public preview URL.

### Demo accounts

The Windows setup creates six accounts with randomized passwords and prints them in the CMD console. These are entirely synthetic: Admin, Free, Basic, Medium, Premium and approved Teacher with one assigned class. A sample Weekly Problem, timed algebra test and PDF booklet are included. Record demo passwords privately when the script prints them. Demo credentials are not uploaded to GitHub.
