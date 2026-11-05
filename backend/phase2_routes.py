"""Phase 2 APIs. Private content is authorization-gated at every read and write."""
from datetime import date, datetime, timedelta
import io
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from private_submission_storage import put_submission, read_submission, attachment_type, MAX_SUBMISSION_BYTES
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import get_db
from auth.dependencies import get_current_user, get_verified_user
from models import (User, Problem, Forum, WeeklyChallenge, WeeklySubmission, TeacherApplication, TeacherForumAssignment,
                    CourseItem, CourseAttempt, ForumMembership)
from phase1_service import require_staff, require_feature, is_staff
from phase2_service import (weekly_bounds, is_teacher_or_staff,
                            run_weekly_transitions, can_enter_forum)

router = APIRouter(prefix="/core", tags=["phase2"])

class WeeklySchedule(BaseModel):
    week_date: date
    problem_id: int = Field(gt=0)
    official_solution: str = Field(min_length=1, max_length=60000)

class WeeklyAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=20000)

class WeeklyReview(BaseModel):
    approve: bool
    note: str = Field(default="", max_length=1000)

class ItemCreate(BaseModel):
    kind: str
    forum_id: int | None = None
    title: str = Field(min_length=2, max_length=250)
    subject: str = Field(min_length=2, max_length=100)
    instructions: str = Field(default="", max_length=2000)
    body: str = Field(min_length=2, max_length=100000)
    published_at: datetime
    due_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=360)

class ItemSubmit(BaseModel):
    answers: str = Field(min_length=1, max_length=40000)

def safe_challenge(challenge, db):
    if not challenge:
        return None
    problem = db.get(Problem, challenge.problem_id)
    if not problem:
        return None
    published = challenge.status == "published"
    winners = []
    if published:
        winners = db.query(WeeklySubmission, User).join(
            User, User.id == WeeklySubmission.student_id).filter(
                WeeklySubmission.challenge_id == challenge.id,
                WeeklySubmission.status == "approved").order_by(
                    WeeklySubmission.submitted_at.asc()).all()
    return {"id": challenge.id, "week_date": challenge.week_date,
            "starts_at": challenge.starts_at, "closes_at": challenge.closes_at,
            "status": challenge.status,
            "problem": {"id": problem.id, "title": problem.title,
                        "description": problem.description, "subject": problem.subject,
                        "level": problem.level},
            "official_solution": challenge.official_solution if published else None,
            "winners": [{"user_id": u.id, "username": u.username} for _, u in winners]}

def active_week(db):
    return db.query(WeeklyChallenge).filter(
        WeeklyChallenge.starts_at <= datetime.utcnow()).order_by(
        WeeklyChallenge.starts_at.desc()).first()

@router.get("/weekly")
def public_weekly(db: Session = Depends(get_db)):
    return {"challenge": safe_challenge(active_week(db), db)}

@router.post("/weekly/admin/schedule")
def schedule_week(data: WeeklySchedule, user: User = Depends(get_verified_user),
                  db: Session = Depends(get_db)):
    require_staff(user)
    if data.week_date.weekday() != 0:
        raise HTTPException(422, "Date must be a Monday")
    start, close = weekly_bounds(data.week_date)
    if start <= datetime.utcnow():
        raise HTTPException(422, "Schedule must be set before Monday 08:00 Europe/Tirane")
    if not db.get(Problem, data.problem_id):
        raise HTTPException(404, "Problem not found")
    challenge = WeeklyChallenge(week_date=data.week_date.isoformat(),
                                problem_id=data.problem_id, starts_at=start,
                                closes_at=close, official_solution=data.official_solution,
                                status="scheduled", created_by=user.id)
    db.add(challenge)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This week already has a challenge")
    db.refresh(challenge)
    return {"id": challenge.id, "week_date": challenge.week_date,
            "starts_at": challenge.starts_at, "closes_at": challenge.closes_at}

@router.get("/weekly/admin/queue")
def weekly_admin_queue(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_staff(user)
    return [{"id": c.id, "week_date": c.week_date, "status": c.status,
             "starts_at": c.starts_at, "closes_at": c.closes_at, "problem_id": c.problem_id,
             "official_solution": c.official_solution}
            for c in db.query(WeeklyChallenge).order_by(WeeklyChallenge.starts_at.desc()).limit(60).all()]

@router.post("/weekly/{challenge_id}/submit")
def submit_weekly(challenge_id: int, data: WeeklyAnswer, user: User = Depends(get_verified_user),
                  db: Session = Depends(get_db)):
    """The Problem of the Week is free; no paid entitlement is required."""
    challenge = db.get(WeeklyChallenge, challenge_id)
    now = datetime.utcnow()
    if not challenge or not (challenge.status == "open" and challenge.starts_at <= now < challenge.closes_at):
        raise HTTPException(409, "Weekly submissions are closed")
    if db.query(WeeklySubmission).filter_by(challenge_id=challenge_id, student_id=user.id).first():
        raise HTTPException(409, "Only one submission per student is allowed")
    s = WeeklySubmission(challenge_id=challenge_id, student_id=user.id,
                         answer_text=data.answer, submitted_at=now, status="pending")
    db.add(s)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You already submitted an answer")
    return {"id": s.id, "status": "pending"}


@router.post("/weekly/{challenge_id}/submit-file")
def submit_weekly_file(challenge_id: int, answer: str = Form(""),
                       file: UploadFile = File(...), user: User = Depends(get_verified_user),
                       db: Session = Depends(get_db)):
    """Student can upload a private written/scanned solution rather than plain text."""
    challenge = db.get(WeeklyChallenge, challenge_id)
    now = datetime.utcnow()
    if not challenge or challenge.status != "open" or not (challenge.starts_at <= now < challenge.closes_at):
        raise HTTPException(409, "Weekly submissions are closed")
    if len(answer) > 20000:
        raise HTTPException(422, "Answer is too long")
    if db.query(WeeklySubmission).filter_by(challenge_id=challenge_id, student_id=user.id).first():
        raise HTTPException(409, "Only one submission per student")
    blob = file.file.read(MAX_SUBMISSION_BYTES + 1)
    key = put_submission(blob, file.content_type)
    submission = WeeklySubmission(challenge_id=challenge_id, student_id=user.id,
                                  answer_text=answer, file_key=key,
                                  submitted_at=now, status="pending")
    db.add(submission)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Already submitted")
    return {"id": submission.id, "status": "pending"}

@router.get("/weekly/admin/submissions/{submission_id}/attachment")
def review_attachment(submission_id: int, user: User = Depends(get_verified_user),
                      db: Session = Depends(get_db)):
    require_staff(user)
    submission = db.get(WeeklySubmission, submission_id)
    if not submission or not submission.file_key:
        raise HTTPException(404, "Attachment not found")
    mime = attachment_type(submission.file_key)
    raw = read_submission(submission.file_key)
    return Response(content=raw, media_type=mime,
                    headers={"Content-Disposition": 'attachment; filename="olimpiada-solution.' +
                             submission.file_key.rsplit(".", 1)[-1] + '"',
                             "Cache-Control": "private, no-store",
                             "X-Content-Type-Options": "nosniff"})

@router.get("/weekly/admin/{challenge_id}/submissions")
def submissions(challenge_id: int, user: User = Depends(get_verified_user),
                db: Session = Depends(get_db)):
    require_staff(user)
    return [{"id": s.id, "student_id": s.student_id, "answer": s.answer_text,
             "status": s.status, "review_note": s.review_note,
             "has_attachment": bool(s.file_key), "submitted_at": s.submitted_at}
            for s in db.query(WeeklySubmission).filter_by(challenge_id=challenge_id)
            .order_by(WeeklySubmission.submitted_at).all()]

@router.post("/weekly/admin/submissions/{submission_id}/review")
def review_submission(submission_id: int, data: WeeklyReview,
                      user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    require_staff(user)
    s = db.query(WeeklySubmission).filter_by(id=submission_id).with_for_update().first()
    if not s:
        raise HTTPException(404, "Submission not found")
    challenge = db.get(WeeklyChallenge, s.challenge_id)
    if challenge.status == "published" or datetime.utcnow() >= challenge.closes_at:
        raise HTTPException(409, "Winner list has already closed")
    s.status = "approved" if data.approve else "rejected"
    s.review_note = data.note
    s.reviewed_at = datetime.utcnow()
    s.reviewed_by = user.id
    db.commit()
    return {"id": s.id, "status": s.status}

@router.get("/forums/catalog")
def forum_catalog(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    """All forums are discoverable, but content never accompanies catalogue entries."""
    return [{"id": f.id, "title": f.title, "subject": f.subject,
             "is_private": f.is_private,
             "accessible": can_enter_forum(user, f, db)}
            for f in db.query(Forum).filter(Forum.is_approved.is_(True))
            .order_by(Forum.created_at.desc()).limit(500).all()
            if user.role != "teacher" or can_enter_forum(user,f,db)]

def serialize_item(item, include_body=True):
    return {"id": item.id, "kind": item.kind, "title": item.title,
            "subject": item.subject, "instructions": item.instructions,
            "body": item.body if include_body else None, "published_at": item.published_at,
            "due_at": item.due_at, "duration_minutes": item.duration_minutes}

@router.post("/courses/admin/items")
def add_course_item(data: ItemCreate, user: User = Depends(get_verified_user),
                    db: Session = Depends(get_db)):
    if user.role not in ("teacher", "admin", "super_admin") and not user.is_superuser:
        raise HTTPException(403, "Only teachers and admins may publish course materials")
    if user.role == "teacher":
        if not data.forum_id or not can_enter_forum(user,db.get(Forum,data.forum_id),db):
            raise HTTPException(403,"Teachers must publish to an assigned forum")
    if data.kind not in ("material", "homework", "test"):
        raise HTTPException(422, "Invalid content type")
    if data.kind == "test" and not data.duration_minutes:
        raise HTTPException(422, "Timed tests require duration_minutes")
    if data.due_at and data.due_at <= data.published_at:
        raise HTTPException(422, "Deadline must follow publication")
    item = CourseItem(**data.model_dump(), created_by=user.id)
    db.add(item)
    db.commit()
    return {"id": item.id}

@router.get("/courses/items")
def course_items(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    if user.role != "teacher":
        require_feature(user, "material")
    now = datetime.utcnow()
    q = db.query(CourseItem).filter(CourseItem.published_at <= now)
    if user.role == "teacher":
        approved=db.query(TeacherApplication).filter_by(user_id=user.id,status="approved").first()
        if not approved: raise HTTPException(403,"Teacher approval required")
        assigned=db.query(TeacherForumAssignment.forum_id).filter_by(teacher_id=user.id).all()
        q=q.filter(CourseItem.forum_id.in_([x[0] for x in assigned]))
    visible = []
    for item in q.order_by(CourseItem.published_at.desc()).limit(300).all():
        if item.forum_id and not can_enter_forum(user, db.get(Forum, item.forum_id), db):
            continue
        visible.append(serialize_item(item, include_body=(item.kind != "test" or is_teacher_or_staff(user))))
        if len(visible) >= 200:
            break
    return visible

@router.get("/courses/admin/items")
def admin_course_items(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    if not is_teacher_or_staff(user):
        raise HTTPException(403,"Staff access required")
    q=db.query(CourseItem)
    if user.role == "teacher":
        approved=db.query(TeacherApplication).filter_by(user_id=user.id,status="approved").first()
        if not approved: raise HTTPException(403,"Teacher approval required")
        assigned=db.query(TeacherForumAssignment.forum_id).filter_by(teacher_id=user.id).all()
        q=q.filter(CourseItem.forum_id.in_([x[0] for x in assigned]))
    return [serialize_item(i) for i in q.order_by(CourseItem.id.desc()).limit(300).all()]

@router.post("/courses/items/{item_id}/start")
def start_test(item_id: int, user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    item = db.get(CourseItem, item_id)
    if not item or item.kind != "test":
        raise HTTPException(404, "Test not found")
    require_feature(user, "test")
    if item.forum_id and not can_enter_forum(user, db.get(Forum, item.forum_id), db):
        raise HTTPException(403, "Not authorized for this classroom")
    now = datetime.utcnow()
    if now < item.published_at or (item.due_at and now >= item.due_at):
        raise HTTPException(409, "Test is not available")
    attempt = db.query(CourseAttempt).filter_by(item_id=item.id, student_id=user.id).first()
    if not attempt:
        attempt = CourseAttempt(item_id=item.id, student_id=user.id, started_at=now)
        db.add(attempt)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            attempt = db.query(CourseAttempt).filter_by(item_id=item.id, student_id=user.id).one()
    deadline = attempt.started_at + timedelta(minutes=item.duration_minutes)
    if item.due_at:
        deadline = min(deadline, item.due_at)
    return {"attempt_id": attempt.id, "started_at": attempt.started_at,
            "deadline": deadline, "server_now": now,
            "submitted": attempt.submitted_at is not None,
            "body": item.body if not attempt.submitted_at and now < deadline else None}

@router.post("/courses/items/{item_id}/submit")
def submit_test(item_id: int, data: ItemSubmit, user: User = Depends(get_verified_user),
                db: Session = Depends(get_db)):
    item = db.get(CourseItem, item_id)
    if not item or item.kind not in ("test", "homework"):
        raise HTTPException(404, "Assignment not found")
    require_feature(user, "test" if item.kind == "test" else "material")
    if item.forum_id and not can_enter_forum(user, db.get(Forum, item.forum_id), db):
        raise HTTPException(403, "Not authorized for this classroom")
    now = datetime.utcnow()
    if now < item.published_at or (item.due_at and now > item.due_at):
        raise HTTPException(409, "Assignment is not open")
    attempt = db.query(CourseAttempt).filter_by(item_id=item_id, student_id=user.id).with_for_update().first()
    if item.kind == "test" and not attempt:
        raise HTTPException(409, "Start your test before submitting")
    if attempt and attempt.submitted_at:
        raise HTTPException(409, "Already submitted")
    if item.kind == "test" and now > attempt.started_at + timedelta(minutes=item.duration_minutes):
        raise HTTPException(409, "Timer expired")
    if not attempt:
        attempt = CourseAttempt(item_id=item_id, student_id=user.id, started_at=now)
        db.add(attempt)
    attempt.answers = data.answers
    attempt.submitted_at = now
    db.commit()
    return {"id": attempt.id, "submitted_at": attempt.submitted_at}
