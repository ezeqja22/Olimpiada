"""Optional in-process scheduler for a single-replica FastAPI deployment.

Enable with ENABLE_INLINE_SCHEDULER=1 only when there is exactly one API
process/replica and no separate phase2_cron.py worker. No additional Railway
service is required. Disabled by default in staging and production.
"""
import asyncio
import logging
import os

from database import SessionLocal
from phase2_service import run_weekly_transitions
from phase3_jobs import send_due_learning_notices

logger = logging.getLogger(__name__)


def inline_scheduler_enabled():
    return os.getenv("ENABLE_INLINE_SCHEDULER", "").strip().lower() in ("1", "true", "yes")


def run_scheduled_cycle():
    """Process due publications and notifications using existing idempotent services."""
    with SessionLocal() as db:
        transitions = run_weekly_transitions(db)
        notifications = send_due_learning_notices(db)
        return {"weekly": transitions, "learning_notices": notifications}


async def inline_scheduler_loop():
    """Run no more than once per minute without blocking the FastAPI event loop."""
    while True:
        await asyncio.sleep(60)
        try:
            result = await asyncio.to_thread(run_scheduled_cycle)
            if result["weekly"]["opened"] or result["weekly"]["published"] or result["learning_notices"]:
                logger.info("Scheduled work completed: %s", result)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Scheduled work failed; will retry next minute")
