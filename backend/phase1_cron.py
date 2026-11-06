"""Execute via a single scheduled worker / external cron, once daily.
Example: 0 3 * * * cd /srv/olimpiada && python backend/phase1_cron.py
"""
import logging
from database import SessionLocal
from phase1_jobs import anonymize_inactive_accounts, send_annual_finance_report
from phase2_service import run_weekly_transitions

logging.basicConfig(level=logging.INFO)

def main():
    with SessionLocal() as db:
        count = anonymize_inactive_accounts(db)
        sent = send_annual_finance_report(db)
        weekly = run_weekly_transitions(db)
        logging.info("Inactive accounts anonymized: %s; annual report sent: %s; weekly %s", count, sent, weekly)

if __name__ == "__main__":
    main()
