"""Public FAQ/support and admin management, without subscription/teacher gates."""
from datetime import datetime, timedelta
from html import escape

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

from auth.dependencies import get_verified_user
from database import get_db
from help_models import FaqEntry, SupportTicket
from models import Notification, User


router = APIRouter(prefix="/experience", tags=["help"])

# The six entries shipped by Alembic 77f26f3 advertise paid plans or features
# that were not enabled in Stage 1. Hide the EXACT seed text until an admin
# edits/replaces it. This avoids altering any existing production records.
LEGACY_SEED_QUESTIONS = {
    "How do I activate a subscription?": "Choose a plan, upload your payment receipt, and await approval.",
    "How does the free trial work?": "On the Subscription page click Activate Free Trial. It never starts automatically.",
    "How can I submit a weekly solution?": "Sign in, open Problem of the Week, and send a text, photo or PDF solution.",
    "How do timed tests work?": "The timer starts when you open a test; the server enforces the deadline.",
    "How can I access library documents?": "An active subscription enables reading in the platform's document viewer.",
    "Why is a forum locked?": "The forum may require a higher subscription plan or an invitation.",
}


def needs_review(entry: FaqEntry) -> bool:
    return LEGACY_SEED_QUESTIONS.get(entry.question_en) == entry.answer_en


def require_admin(user: User = Depends(get_verified_user)) -> User:
    if user.role not in ("admin", "super_admin") and not user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


class FaqData(BaseModel):
    category: str = Field(min_length=2, max_length=60)
    question_sq: str = Field(min_length=5, max_length=300)
    answer_sq: str = Field(min_length=5, max_length=12000)
    question_en: str = Field(min_length=5, max_length=300)
    answer_en: str = Field(min_length=5, max_length=12000)
    position: int = Field(default=0, ge=0, le=10000)
    active: bool = True

    @field_validator("category", "question_sq", "answer_sq", "question_en", "answer_en", mode="before")
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class TicketNew(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    category: str = Field(default="general", min_length=2, max_length=50)
    subject: str = Field(min_length=4, max_length=200)
    message: str = Field(min_length=12, max_length=5000)

    @field_validator("name", "category", "subject", "message", mode="before")
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class TicketReply(BaseModel):
    status: str = Field(pattern=r"^(open|in_progress|resolved)$")
    response: str = Field(default="", max_length=5000)


def faq_item(entry: FaqEntry) -> dict:
    return {
        "id": entry.id, "category": entry.category,
        "question_sq": entry.question_sq, "answer_sq": entry.answer_sq,
        "question_en": entry.question_en, "answer_en": entry.answer_en,
    }


@router.get("/faq")
def public_faq(db: Session = Depends(get_db)):
    entries = db.query(FaqEntry).filter(FaqEntry.active.is_(True)).order_by(
        FaqEntry.position, FaqEntry.id
    ).all()
    return [faq_item(entry) for entry in entries if not needs_review(entry)]


@router.get("/admin/faq")
def admin_faq(_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    entries = db.query(FaqEntry).order_by(FaqEntry.position, FaqEntry.id).all()
    return [{**faq_item(entry), "position": entry.position,
             "active": entry.active, "needs_review": needs_review(entry)} for entry in entries]


@router.post("/admin/faq", status_code=201)
def create_faq(data: FaqData, _admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    entry = FaqEntry(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id}


@router.put("/admin/faq/{entry_id}")
def edit_faq(entry_id: int, data: FaqData, _admin: User = Depends(require_admin),
             db: Session = Depends(get_db)):
    entry = db.get(FaqEntry, entry_id)
    if entry is None:
        raise HTTPException(404, "FAQ not found")
    for key, value in data.model_dump().items():
        setattr(entry, key, value)
    db.commit()
    return {"ok": True, "needs_review": needs_review(entry)}


@router.post("/support/tickets", status_code=201)
def submit_ticket(data: TicketNew, db: Session = Depends(get_db)):
    # Per-email throttling supplements (but does not replace) edge-level IP rate limits.
    email = str(data.email).lower()
    since = datetime.utcnow() - timedelta(hours=1)
    count = db.query(SupportTicket).filter(
        SupportTicket.email == email, SupportTicket.created_at >= since
    ).count()
    if count >= 3:
        raise HTTPException(429, "Too many requests. Try later.")

    ticket = SupportTicket(
        name=data.name, email=email, category=data.category,
        subject=data.subject, message=data.message,
        status="open", created_at=datetime.utcnow(), updated_at=datetime.utcnow(),
    )
    db.add(ticket)
    db.flush()
    for admin in db.query(User).filter(
        User.role.in_(("admin", "super_admin")), User.is_active.is_(True)
    ).limit(25).all():
        db.add(Notification(
            user_id=admin.id, type="support_ticket",
            title=f"Support #{ticket.id}: {ticket.subject}"[:250],
            message=f"New ticket from {ticket.name}"[:500],
            data={"link": "/admin/support"},
        ))
    db.commit()
    db.refresh(ticket)
    return {"ticket_id": ticket.id, "status": "open"}


@router.get("/admin/tickets")
def admin_tickets(_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).limit(200).all()
    return [{
        "id": ticket.id, "name": ticket.name, "email": ticket.email,
        "category": ticket.category, "subject": ticket.subject,
        "message": ticket.message, "status": ticket.status,
        "response": ticket.admin_response, "created_at": ticket.created_at,
    } for ticket in tickets]


@router.put("/admin/tickets/{ticket_id}")
def update_ticket(ticket_id: int, data: TicketReply,
                  _admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    ticket = db.get(SupportTicket, ticket_id)
    if ticket is None:
        raise HTTPException(404, "Ticket not found")
    changed_reply = bool(data.response.strip()) and data.response != (ticket.admin_response or "")
    ticket.status = data.status
    ticket.admin_response = data.response
    ticket.updated_at = datetime.utcnow()
    db.commit()

    email_delivered = None
    if changed_reply:
        from email_service import email_service
        try:
            email_delivered = email_service.send_notification_email(
                ticket.email, f"Olimpiada Support #{ticket.id}",
                escape(data.response).replace("\n", "<br>"),
            )
        except Exception:
            email_delivered = False
    return {"ok": True, "email_delivered": email_delivered}
