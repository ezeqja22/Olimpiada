"""Idempotent annual finance summary and privacy-preserving inactive-account cleanup."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import User, UserSession, MonthlyExpense, AnnualReportDelivery
from email_service import email_service
from phase1_service import is_super_admin
import secrets

def anonymize_inactive_accounts(db: Session):
    """Purge personally identifying account fields; preserve FK-linked learning history.
    Re-registration with the same email/username becomes possible immediately.
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(days=365)
    users = db.query(User).filter(
        User.is_active.is_(True),
        User.created_at < cutoff,
    ).all()
    count = 0
    for u in users:
        if is_super_admin(u) or u.role in ("admin", "reviewer", "moderator", "teacher"):
            continue
        activity = u.last_activity_at or u.last_login or u.created_at
        if activity >= cutoff:
            continue
        u.email = f"deleted-{u.id}-{secrets.token_hex(6)}@deleted.invalid"
        u.username = f"deleted-user-{u.id}-{secrets.token_hex(4)}"
        u.password_hash = secrets.token_urlsafe(48)
        u.bio = None
        u.profile_picture = None
        u.verification_code = None
        u.reset_token = None
        u.marketing_emails = False
        u.is_active = False
        # Existing unverified-account cleanup must not try to delete FK-linked tombstones.
        u.is_verified = True
        for session in db.query(UserSession).filter(UserSession.user_id == u.id).all():
            session.revoked_at = now
        count += 1
    db.commit()
    return count

def send_annual_finance_report(db: Session, now=None):
    """Send last calendar year's expenses once during January (retry on email failure)."""
    now = now or datetime.utcnow()
    if now.month != 1:
        return False
    year = now.year - 1
    delivery = db.get(AnnualReportDelivery, year)
    if delivery and delivery.status == "sent":
        return False
    recipients = db.query(User).filter(User.is_active.is_(True)).all()
    recipients = [u for u in recipients if is_super_admin(u)]
    if not recipients:
        return False
    rows = db.query(MonthlyExpense).filter(MonthlyExpense.year == year).all()
    monthly = {month: 0 for month in range(1, 13)}
    for expense in rows:
        monthly[expense.month] += expense.amount_all
    total = sum(monthly.values())
    body = f"Raporti vjetor i shpenzimeve {year}. Totali: {total:,} ALL.\n" + "\n".join(
        f"Muaji {month}: {monthly[month]:,} ALL" for month in range(1, 13))
    # Do not mark sent until every Super Admin has received the email.
    for user in recipients:
        if not email_service.send_notification_email(
            user.email, f"Olimpiada - Raporti financiar {year}", body):
            return False
    if not delivery:
        delivery = AnnualReportDelivery(year=year)
        db.add(delivery)
    delivery.sent_at = now
    delivery.status = "sent"
    db.commit()
    return True
