"""Run once every minute under a single scheduled worker.

Cron example (UTC system timezone is fine; weekly boundaries are stored in UTC):
* * * * * cd /srv/olimpiada && /venv/bin/python backend/phase2_cron.py

Publishes scheduled problems each Monday 08:00 Europe/Tirane and publishes
approved winners plus official solutions each Sunday 20:00 Europe/Tirane.
Idempotent on repeated invocations and catches up if the worker was offline.
"""
from database import SessionLocal
from phase2_service import run_weekly_transitions
from phase3_jobs import send_due_learning_notices

if __name__ == "__main__":
    with SessionLocal() as db:
        print(run_weekly_transitions(db))
        print({"learning_notices":send_due_learning_notices(db)})
