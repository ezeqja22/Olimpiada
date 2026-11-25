"""Run a disposable weekly grading fixture for the loopback browser test."""
from datetime import timedelta, datetime
import uvicorn
from fastapi import Request
from ux_browser_harness import app, fixture, SessionLocal, credentials, models, clean, engine, dbfile

@app.post("/__ux/weekly-fixture")
def weekly_fixture(request: Request):
    fixture(request)
    now = datetime.utcnow()
    with SessionLocal.begin() as db:
        admin = credentials["admin"]["id"]
        problem = models.Problem(title="[UX-TEST] Weekly geometry", description="Find x.", subject="Math", author_id=admin)
        db.add(problem)
        db.flush()
        challenge = models.WeeklyChallenge(week_date=(now.date()-timedelta(days=now.weekday()+7)).isoformat(),
            problem_id=problem.id, starts_at=now-timedelta(days=8), closes_at=now-timedelta(days=1),
            official_solution="Synthetic solution", status="closed", created_by=admin)
        db.add(challenge)
        db.flush()
        db.add(models.WeeklySubmission(challenge_id=challenge.id, student_id=credentials["student"]["id"], answer_text="Synthetic answer"))
    return {"ready": True}

if __name__ == "__main__":
    try:
        uvicorn.run(app, host="127.0.0.1", port=8028, access_log=False)
    finally:
        clean()
        engine.dispose()
        dbfile.unlink(missing_ok=True)
