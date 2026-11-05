"""Docker-free, isolated Windows staging launcher.

Usage: python staging/local.py init|api|frontend|check
Never loads a production .env or reuses a production database.
"""
import json
import os
import runpy
import secrets
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "staging" / ".local-state"
DATABASE = STATE / "olimpiada-local.sqlite3"
PRIVATE = STATE / "private-files"
CREDENTIALS = STATE / "secret.json"
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend" / "olympiad-frontend"


def configure():
    STATE.mkdir(parents=True, exist_ok=True)
    PRIVATE.mkdir(parents=True, exist_ok=True)
    if not CREDENTIALS.exists():
        # Local-only secret; never copied to GitHub or the staging website.
        with CREDENTIALS.open("x", encoding="utf-8") as handle:
            json.dump({"secret_key": secrets.token_urlsafe(64)}, handle)
    with CREDENTIALS.open(encoding="utf-8") as handle:
        secret = json.load(handle)["secret_key"]
    # Explicitly override any production .env values inherited from the shell.
    os.environ.update({
        "DATABASE_URL": "sqlite:///" + DATABASE.as_posix(),
        "SECRET_KEY": secret,
        "STAGING_MODE": "1",
        "PRIVATE_FILES_DIR": str(PRIVATE),
        "STAGING_PUBLIC_API_URL": "http://127.0.0.1:8001",
        "FRONTEND_ORIGINS": "http://127.0.0.1:5174,http://localhost:5174",
        "REACT_APP_API_URL": "http://127.0.0.1:8001",
        "PYTHONPATH": str(BACKEND),
        # Never connect to real SMTP, Resend, or Cloudinary during local tests.
        "SMTP_SERVER": "mailpit",
        "SMTP_PORT": "1025",
        "SMTP_USERNAME": "staging@olimpiada.test",
        "SMTP_USE_TLS": "false",
        "EMAIL_FROM_ADDRESS": "staging@olimpiada.test",
        "RESEND_API_KEY": "",
        "CLOUDINARY_API_KEY": "",
        "CLOUDINARY_API_SECRET": "",
        "CLOUDINARY_CLOUD_NAME": "",
        "S3_PRIVATE_BUCKET": "",
        "S3_ACCESS_KEY_ID": "",
        "S3_SECRET_ACCESS_KEY": "",
    })
    sys.path.insert(0, str(BACKEND))
    os.chdir(ROOT)


def migrate_legacy_demo_addresses():
    """Upgrade only six local demo emails; preserve hashed passwords and all data."""
    if not DATABASE.is_file():
        return
    from database import SessionLocal
    from models import User
    changed = 0
    with SessionLocal() as db:
        for short in ("admin", "free", "student", "member", "other", "teacher"):
            old = f"demo-{short}@olimpiada.test"
            new = f"demo-{short}@example.com"
            existing = db.query(User).filter(User.email == old).one_or_none()
            if existing:
                if db.query(User).filter(User.email == new).first():
                    raise SystemExit(f"Cannot migrate {old}: the destination already exists.")
                existing.email = new
                changed += 1
        db.commit()
    if changed:
        print(f"Upgraded {changed} local demo emails (passwords unchanged).")


def initialize():
    from database import engine
    from models import Base
    Base.metadata.create_all(bind=engine)
    print("Created/verified isolated SQLite database:", DATABASE)
    # Exactly once: seed_demo checks whether the users already exist.
    runpy.run_path(str(ROOT / "staging" / "seed_demo.py"), run_name="__main__")
    print("Local staging setup complete. No Docker required.")


def check():
    from fastapi.testclient import TestClient
    from main import app
    from database import SessionLocal
    from models import User
    with TestClient(app) as client:
        for route in ("/health", "/experience/faq"):
            response = client.get(route)
            if response.status_code != 200:
                raise RuntimeError(f"{route} returned {response.status_code}: {response.text[:240]}")
    with SessionLocal() as db:
        count = db.query(User).filter(User.email.like("demo-%@example.com")).count()
        if count != 6:
            raise RuntimeError(f"Expected 6 isolated demo users, found {count}")
    # Validate the actual login path (Pydantic EmailStr and JWT), not just /health.
    from auth.schemas import LoginRequest
    from auth.utils import hash_password
    from models import UserSession
    synthetic_email = f"local-login-check-{secrets.token_hex(5)}@example.com"
    synthetic_password = secrets.token_urlsafe(16)
    assert LoginRequest(email="demo-admin@example.com", password="test").email
    with SessionLocal() as db:
        temp = User(username="local-check-" + secrets.token_hex(7),
                    email=synthetic_email, password_hash=hash_password(synthetic_password),
                    role="student", is_active=True, is_verified=True, is_banned=False)
        db.add(temp)
        db.commit()
        test_id = temp.id
    try:
        with TestClient(app) as client:
            response = client.post("/auth/login", json={"email": synthetic_email, "password": synthetic_password})
            if response.status_code != 200:
                raise RuntimeError(f"Valid login returned {response.status_code}: {response.text[:240]}")
            token = response.json()["token"]
            me = client.get("/auth/me", headers={"Authorization": "Bearer " + token})
            if me.status_code != 200 or me.json().get("email") != synthetic_email:
                raise RuntimeError(f"Authenticated /auth/me failed ({me.status_code}): {me.text[:240]}")
    finally:
        with SessionLocal() as db:
            db.query(UserSession).filter(UserSession.user_id == test_id).delete(synchronize_session=False)
            user = db.get(User, test_id)
            if user:
                db.delete(user)
            db.commit()
    print("PASS: local SQLite, isolated demo users and real login endpoint.")


def reset_demo_passwords():
    if not DATABASE.is_file():
        raise SystemExit("Local demo database missing. Run staging\\local-setup.cmd first.")
    from database import SessionLocal
    from auth.utils import hash_password
    from models import User

    passwords = []
    with SessionLocal() as db:
        for short in ("admin", "free", "student", "member", "other", "teacher"):
            email = f"demo-{short}@example.com"
            account = db.query(User).filter(User.email == email).one_or_none()
            if account is None:
                raise SystemExit(f"Missing {email}. Run staging\\local-setup.cmd first.")
            new_password = secrets.token_urlsafe(13)
            account.password_hash = hash_password(new_password)
            passwords.append((email, new_password))
        db.commit()

    print("New demo passwords (save locally; not stored in a readable file):")
    for email, password in passwords:
        print(f"  {email} => {password}")


def serve_api():
    import uvicorn
    uvicorn.run("main:app", app_dir=str(BACKEND), host="127.0.0.1", port=8001, log_level="info")


def serve_frontend():
    os.environ["REACT_APP_API_URL"] = "http://127.0.0.1:8001"
    subprocess.run(
        ["npm.cmd" if os.name == "nt" else "npm",
         "run", "dev", "--", "--host", "127.0.0.1", "--port", "5174", "--strictPort"],
        cwd=FRONTEND, env=os.environ.copy(), check=True,
    )


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ("init", "check", "api", "frontend", "reset"):
        raise SystemExit("Usage: python staging/local.py {init|check|api|frontend|reset}")
    configure()
    migrate_legacy_demo_addresses()
    {"init": initialize, "check": check, "api": serve_api, "frontend": serve_frontend, "reset": reset_demo_passwords}[sys.argv[1]]()
