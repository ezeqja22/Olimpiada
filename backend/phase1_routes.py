"""Account access, learning catalogue, tutoring and admin finance API."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from auth.utils import SECRET_KEY, create_jwt
from models import UserSession
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database import get_db
from auth.dependencies import get_current_user, get_verified_user
from models import (User, Forum, Problem, SystemSettings,
                    LearningResource, TeacherSubject, TutoringRequest, MonthlyExpense)
from phase1_service import LEARNING_FEATURES, has_feature, require_feature, require_staff, is_super_admin

router = APIRouter(tags=["phase1"])

class TeacherSubjectCreate(BaseModel):
    teacher_id: int
    subject: str = Field(min_length=2, max_length=100)

class TutoringCreate(BaseModel):
    teacher_id: int
    subject: str = Field(min_length=2, max_length=100)
    message: str = Field(default="", max_length=2000)

class TutoringDecision(BaseModel):
    approve: bool
    note: str = Field(default="", max_length=1000)

class ResourceCreate(BaseModel):
    kind: str
    title: str = Field(min_length=2, max_length=250)
    subject: str = Field(default="", max_length=100)
    body: str = ""
    scheduled_at: datetime | None = None

class ExpenseCreate(BaseModel):
    year: int = Field(ge=2020, le=2100)
    month: int = Field(ge=1, le=12)
    category: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=500)
    amount_all: int = Field(ge=0, le=100000000)

class WeeklyProblemSet(BaseModel):
    problem_id: int

@router.get("/access/me")
def my_access(user: User = Depends(get_current_user)):
    return {"role": user.role, "features": [f for f in LEARNING_FEATURES if has_feature(user, f)]}

@router.get("/public/forums")
def public_forum_titles(db: Session = Depends(get_db)):
    return [{"id": f.id, "title": f.title, "subject": f.subject, "level": f.level,
             "locked": True} for f in db.query(Forum).filter(
                 Forum.is_private.is_(False), Forum.is_approved.is_(True)
             ).order_by(Forum.created_at.desc()).limit(100).all()]

@router.get("/public/library")
def public_library_titles(db: Session = Depends(get_db)):
    from models import LibraryDocument
    docs = db.query(LibraryDocument).order_by(LibraryDocument.created_at.desc()).limit(200).all()
    return [{"id": d.id, "title": d.title, "subject": d.subject, "level": d.level,
             "category": d.category, "kind": "library", "locked": True} for d in docs]

@router.get("/public/problem-of-week")
def public_problem_of_week(db: Session = Depends(get_db)):
    from phase2_routes import active_week, safe_challenge
    current = safe_challenge(active_week(db), db)
    return {"problem": current["problem"] if current else None,
            "challenge": current}

@router.post("/access/admin/problem-of-week")
def set_weekly_problem(data: WeeklyProblemSet, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_staff(user)
    if not db.query(Problem).filter(Problem.id == data.problem_id).first():
        raise HTTPException(404, "Problem not found")
    setting = db.query(SystemSettings).filter(SystemSettings.key == "weekly_problem_id").first()
    if setting:
        setting.value = str(data.problem_id)
    else:
        db.add(SystemSettings(key="weekly_problem_id", value=str(data.problem_id)))
    db.commit()
    return {"problem_id": data.problem_id}

@router.get("/access/teachers")
def list_teachers(subject: str = "", db: Session = Depends(get_db)):
    q = db.query(TeacherSubject, User).join(User, TeacherSubject.teacher_id == User.id).filter(
        User.is_active.is_(True), User.role == "teacher")
    if subject:
        q = q.filter(TeacherSubject.subject == subject.strip())
    return [{"teacher_id": teacher.id, "teacher": teacher.username, "subject": record.subject}
            for record, teacher in q.all()]

@router.post("/access/admin/teacher-subjects")
def add_teacher_subject(data: TeacherSubjectCreate, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    require_staff(user)
    teacher = db.query(User).filter(User.id == data.teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(422, "Teacher not found")
    if db.query(TeacherSubject).filter_by(teacher_id=data.teacher_id, subject=data.subject.strip()).first():
        raise HTTPException(409, "Already assigned")
    db.add(TeacherSubject(teacher_id=data.teacher_id, subject=data.subject.strip()))
    db.commit()
    return {"ok": True}

@router.post("/access/tutoring/requests")
def request_tutoring(data: TutoringCreate, user: User = Depends(get_verified_user),
                     db: Session = Depends(get_db)):
    require_feature(user, "tutoring")
    teacher_subject = db.query(TeacherSubject).join(User, TeacherSubject.teacher_id == User.id).filter(
        TeacherSubject.teacher_id == data.teacher_id, TeacherSubject.subject == data.subject.strip(),
        User.role == "teacher", User.is_active.is_(True)).first()
    if not teacher_subject:
        raise HTTPException(422, "Teacher does not teach this subject")
    req = TutoringRequest(student_id=user.id, teacher_id=data.teacher_id,
                          subject=data.subject.strip(), message=data.message, status="pending")
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"id": req.id, "status": req.status}

@router.get("/access/admin/tutoring")
def tutoring_queue(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_staff(user)
    return [{"id": r.id, "student_id": r.student_id, "teacher_id": r.teacher_id, "subject": r.subject,
             "message": r.message, "status": r.status, "created_at": r.created_at}
            for r in db.query(TutoringRequest).order_by(TutoringRequest.created_at.desc()).limit(250).all()]

@router.post("/access/admin/tutoring/{request_id}/review")
def decide_tutoring(request_id: int, data: TutoringDecision, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    require_staff(user)
    req = db.query(TutoringRequest).filter(TutoringRequest.id == request_id).with_for_update().first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status != "pending":
        raise HTTPException(409, "Already reviewed")
    req.status = "approved" if data.approve else "rejected"
    req.admin_note = data.note
    req.reviewed_by = user.id
    req.reviewed_at = datetime.utcnow()
    db.commit()
    return {"id": req.id, "status": req.status}

@router.get("/access/resources")
def resources(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    require_feature(user, "material")
    from sqlalchemy import or_
    published = db.query(LearningResource).filter(or_(
        LearningResource.scheduled_at.is_(None),
        LearningResource.scheduled_at <= datetime.utcnow()
    )).order_by(LearningResource.id.desc()).all()
    return [{"id": r.id, "kind": r.kind, "title": r.title, "subject": r.subject,
             "body": r.body, "scheduled_at": r.scheduled_at} for r in published]

@router.post("/access/admin/resources")
def add_resource(data: ResourceCreate, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    require_staff(user)
    if data.kind not in ("meet", "material", "test"):
        raise HTTPException(422, "Invalid resource type")
    r = LearningResource(kind=data.kind, title=data.title, subject=data.subject,
                         body=data.body, scheduled_at=data.scheduled_at)
    db.add(r)
    db.commit()
    return {"id": r.id}

@router.get("/access/admin/expenses")
def expenses(year: int = 0, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_staff(user)
    year = year or datetime.utcnow().year
    rows = db.query(MonthlyExpense).filter(MonthlyExpense.year == year).order_by(
        MonthlyExpense.month, MonthlyExpense.id).all()
    return {"year": year, "total_all": sum(row.amount_all for row in rows),
            "expenses": [{"id": e.id, "year": e.year, "month": e.month, "category": e.category,
                          "description": e.description, "amount_all": e.amount_all} for e in rows]}

@router.post("/access/admin/expenses")
def add_expense(data: ExpenseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_staff(user)
    expense = MonthlyExpense(year=data.year, month=data.month, category=data.category,
                             description=data.description, amount_all=data.amount_all, created_by=user.id)
    db.add(expense)
    db.commit()
    return {"id": expense.id}

@router.delete("/access/admin/expenses/{expense_id}")
def remove_expense(expense_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_super_admin(user):
        raise HTTPException(403, "Only Super Admin may delete expenses")
    expense = db.get(MonthlyExpense, expense_id)
    if not expense:
        raise HTTPException(404, "Expense not found")
    db.delete(expense)
    db.commit()
    return {"ok": True}


@router.post("/access/session/refresh")
def refresh_session(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
    return {"token": create_jwt(user.id, db, session_id=payload["sid"])}

@router.post("/access/session/logout")
def revoke_session(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
    session = db.query(UserSession).filter(UserSession.id == payload["sid"],
                                           UserSession.user_id == user.id).first()
    if session:
        session.revoked_at = datetime.utcnow()
        db.commit()
    return {"ok": True}


@router.get("/access/admin/ga4")
def admin_ga4(user: User = Depends(get_current_user)):
    require_staff(user)
    from ga4_service import get_ga4_summary
    return get_ga4_summary()
