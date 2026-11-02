"""Subscription, manual bank-slip review, learning catalogue and admin finance API."""
import io
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from auth.utils import SECRET_KEY, create_jwt
from models import UserSession
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database import get_db
from auth.dependencies import get_current_user, get_verified_user
from models import (User, Forum, Problem, SystemSettings, PaymentSubmission,
                    LearningResource, TeacherSubject, TutoringRequest, MonthlyExpense,
                    AdminAction)
from phase1_service import PLANS, add_months, effective_plan, has_feature, require_feature, require_staff, is_super_admin
from PIL import Image
import cloudinary
import cloudinary.uploader
import cloudinary.utils

router = APIRouter(tags=["phase1"])
MAX_RECEIPT_BYTES = 5 * 1024 * 1024

class PaymentCreate(BaseModel):
    plan: str
    months: int = Field(ge=1, le=12)

class ReviewDecision(BaseModel):
    approve: bool
    note: str = Field(default="", max_length=1000)

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

def payment_view(p, include_receipt=False):
    result = dict(id=p.id, user_id=p.user_id, plan=p.plan, months=p.months,
                  amount_all=p.amount_all, status=p.status, created_at=p.created_at,
                  reviewed_at=p.reviewed_at, reviewer_note=p.reviewer_note)
    if include_receipt and p.receipt_public_id:
        if p.receipt_public_id.startswith("staging-receipt:"):
            result["receipt_available"] = True
        else:
            result["receipt_url"] = cloudinary.utils.cloudinary_url(
                p.receipt_public_id, resource_type="image", type="authenticated",
                sign_url=True, secure=True, expires_at=int(datetime.utcnow().timestamp()) + 300
            )[0]
    return result

@router.get("/access/plans")
def get_plans():
    return {"plans": PLANS, "trial_days_display": "1 month", "trial_automatic": False}

@router.get("/access/me")
def my_access(user: User = Depends(get_current_user)):
    return {"role": user.role, "plan": effective_plan(user),
            "trial_used": bool(user.trial_used_at), "trial_ends_at": user.trial_expires_at,
            "subscription_plan": user.subscription_plan,
            "subscription_expires_at": user.subscription_expires_at,
            "features": [f for f in ["forum", "meet", "material", "test", "tutoring"] if has_feature(user, f)]}

@router.post("/access/trial/start")
def start_trial(user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user.id).with_for_update().one()
    if user.trial_used_at or effective_plan(user) not in ("free",):
        raise HTTPException(409, "Trial already claimed or subscription is active")
    now = datetime.utcnow()
    user.trial_used_at = now
    user.trial_expires_at = add_months(now, 1)
    db.commit()
    return {"plan": "medium", "trial_ends_at": user.trial_expires_at}

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

@router.post("/access/payments")
def submit_payment(plan: str, months: int, receipt: UploadFile = File(...),
                   user: User = Depends(get_verified_user), db: Session = Depends(get_db)):
    if plan not in PLANS or months < 1 or months > 12:
        raise HTTPException(422, "Invalid plan or months (1-12)")
    if receipt.content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(415, "Receipt must be a PNG, JPG or WEBP image")
    data = receipt.file.read(MAX_RECEIPT_BYTES + 1)
    if len(data) > MAX_RECEIPT_BYTES or not data:
        raise HTTPException(413, "Receipt must be under 5 MB")
    try:
        image = Image.open(io.BytesIO(data))
        image.verify()
    except Exception:
        raise HTTPException(422, "Invalid image file")
    if os.getenv("STAGING_MODE") == "1":
        from private_pdf_storage import _local_root
        import secrets
        key = secrets.token_hex(16)
        output = io.BytesIO()
        Image.open(io.BytesIO(data)).convert("RGB").save(output, format="JPEG", quality=85)
        folder = _local_root() / "receipts"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / (key + ".jpg")).write_bytes(output.getvalue())
        uploaded = {"public_id": "staging-receipt:" + key}
    else:
        if not (os.getenv("CLOUDINARY_CLOUD_NAME") and os.getenv("CLOUDINARY_API_KEY") and os.getenv("CLOUDINARY_API_SECRET")):
            raise HTTPException(503, "Private receipt storage not configured")
        try:
            uploaded = cloudinary.uploader.upload(
                data, resource_type="image", type="authenticated", folder="olimpiada/receipts",
                use_filename=False, unique_filename=True, overwrite=False)
        except Exception:
            raise HTTPException(503, "Could not store receipt; try again")
    payment = PaymentSubmission(user_id=user.id, plan=plan, months=months,
                                amount_all=PLANS[plan]["monthly_all"] * months,
                                receipt_public_id=uploaded["public_id"], status="pending")
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment_view(payment)


@router.get("/access/admin/payments/{payment_id}/receipt")
def stage_receipt(payment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Reviewer-only private image; never a public URL. Local staging storage only."""
    require_staff(user)
    if os.getenv("STAGING_MODE") != "1":
        raise HTTPException(404, "Unavailable")
    payment = db.get(PaymentSubmission, payment_id)
    if not payment or not payment.receipt_public_id.startswith("staging-receipt:"):
        raise HTTPException(404, "Receipt not found")
    token = payment.receipt_public_id.removeprefix("staging-receipt:")
    if len(token) != 32 or any(ch not in "0123456789abcdef" for ch in token):
        raise HTTPException(404, "Receipt not found")
    from private_pdf_storage import _local_root
    from fastapi.responses import Response
    path = _local_root() / "receipts" / (token + ".jpg")
    if not path.is_file():
        raise HTTPException(404, "Receipt not found")
    return Response(content=path.read_bytes(), media_type="image/jpeg",
                    headers={"Cache-Control": "private, no-store",
                             "X-Content-Type-Options": "nosniff"})

@router.get("/access/payments/mine")
def my_payments(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [payment_view(p) for p in db.query(PaymentSubmission).filter(
        PaymentSubmission.user_id == user.id).order_by(PaymentSubmission.created_at.desc()).all()]

@router.get("/access/admin/payments")
def review_queue(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_staff(user)
    payments = db.query(PaymentSubmission).order_by(PaymentSubmission.created_at.desc()).limit(250).all()
    return [payment_view(p, include_receipt=True) for p in payments]

@router.post("/access/admin/payments/{payment_id}/review")
def review_payment(payment_id: int, data: ReviewDecision, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    require_staff(user)
    payment = db.query(PaymentSubmission).filter(PaymentSubmission.id == payment_id).with_for_update().first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.status != "pending":
        raise HTTPException(409, "Payment has already been reviewed")
    customer = db.query(User).filter(User.id == payment.user_id).with_for_update().first()
    if not customer:
        raise HTTPException(404, "Student not found")
    now = datetime.utcnow()
    payment.status = "approved" if data.approve else "rejected"
    payment.reviewed_by = user.id
    payment.reviewed_at = now
    payment.reviewer_note = data.note
    if data.approve:
        start = max(now, customer.subscription_expires_at or now) if customer.subscription_plan == payment.plan else now
        customer.subscription_plan = payment.plan
        customer.subscription_expires_at = add_months(start, payment.months)
    db.add(AdminAction(admin_id=user.id, action_type="payment_review",
                       target_id=payment.id, target_type="payment",
                       details=f"{payment.status}; plan={payment.plan}; months={payment.months}"))
    db.commit()
    return payment_view(payment)

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
