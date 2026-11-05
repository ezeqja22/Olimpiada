"""Membership-based forum access and timezone-correct weekly-challenge transitions."""
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import HTTPException
from models import ForumMembership, WeeklyChallenge, TeacherForumAssignment, TeacherApplication
from phase1_service import is_staff

TIRANA = ZoneInfo("Europe/Tirane")

def is_teacher_or_staff(user):
    return user is not None and (user.role == "teacher" or is_staff(user))

def can_enter_forum(user, forum, db):
    if not user or not forum:
        return False
    denied = db.query(ForumMembership).filter(
        ForumMembership.user_id == user.id,
        ForumMembership.forum_id == forum.id,
        ForumMembership.is_banned.is_(True)).first()
    if denied:
        return False
    if is_staff(user):
        return True
    if user.role == "teacher":
        application = db.query(TeacherApplication).filter_by(user_id=user.id,status="approved").first()
        return bool(application and db.query(TeacherForumAssignment).filter_by(teacher_id=user.id,forum_id=forum.id).first())
    if not forum.is_approved:
        return False
    if forum.is_private:
        return bool(db.query(ForumMembership).filter(
            ForumMembership.forum_id == forum.id,
            ForumMembership.user_id == user.id,
            ForumMembership.is_active.is_(True)).first())
    return True

def require_forum(user, forum, db):
    if not can_enter_forum(user, forum, db):
        raise HTTPException(status_code=403, detail="Forum membership required")
    return forum

def weekly_bounds(monday_date):
    if monday_date.weekday() != 0:
        raise ValueError("Weekly challenge must start on Monday")
    start = datetime.combine(monday_date, time(8, 0), tzinfo=TIRANA)
    close = datetime.combine(monday_date + timedelta(days=6), time(20, 0), tzinfo=TIRANA)
    # DB stores timezone-naive UTC in keeping with current SQLAlchemy project convention.
    return (start.astimezone(timezone.utc).replace(tzinfo=None),
            close.astimezone(timezone.utc).replace(tzinfo=None))

def current_week_date(now=None):
    now = now or datetime.now(timezone.utc)
    local = now.astimezone(TIRANA)
    return (local.date() - timedelta(days=local.weekday()))

def run_weekly_transitions(db, now=None):
    """Idempotent, safe to re-run. No emailing within transition transaction."""
    now = now or datetime.utcnow()
    opened, published = 0, 0
    for challenge in db.query(WeeklyChallenge).filter(
        WeeklyChallenge.status.in_(("scheduled", "open"))).all():
        if challenge.status == "scheduled" and now >= challenge.starts_at:
            challenge.status = "open"
            opened += 1
        if challenge.status == "open" and now >= challenge.closes_at:
            challenge.status = "published"
            challenge.published_at = challenge.closes_at
            published += 1
    db.commit()
    return {"opened": opened, "published": published}
