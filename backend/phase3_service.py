"""Safe email-template rendering and notification outbox."""
import html
import re
from datetime import datetime
from fastapi import HTTPException
from models import EmailTemplate, EmailDeliveryLog, Notification, User
from email_service import email_service

TEMPLATE_DEFAULTS = {
 "new_homework": ("Detyrë e re: {{title}}","New homework: {{title}}",
                  "Përshëndetje {{name}}, është publikuar detyra {{title}}. Hyr në {{link}}.",
                  "Hello {{name}}, new homework {{title}} is available at {{link}}."),
 "new_test": ("Test i ri: {{title}}","New test: {{title}}",
              "Përshëndetje {{name}}, testi {{title}} është publikuar. Hyr në {{link}}.",
              "Hello {{name}}, the test {{title}} is now available at {{link}}."),
 "new_result": ("Rezultati yt: {{title}}","Your result: {{title}}",
                "Përshëndetje {{name}}, rezultati i {{title}} është publikuar: {{result}}.",
                "Hello {{name}}, your result for {{title}}: {{result}}."),
 "parent_progress": ("Raporti i progresit: {{child_name}}","Progress report: {{child_name}}",
                     "Përshëndetje {{name}}, raporti për {{child_name}}: {{result}}.",
                     "Hello {{name}}, progress report for {{child_name}}: {{result}}."),
 "forum_meeting": ("Takimi i forumit {{forum_name}}","Meeting in forum {{forum_name}}",
                  "Përshëndetje {{name}}, takimi i forumit {{forum_name}}: {{title}}. {{link}}",
                  "Hello {{name}}, upcoming meeting in {{forum_name}}: {{title}}. {{link}}"),
}
ALLOWED_TOKENS = {"name","title","child_name","forum_name","result","link"}
TOKEN_RE = re.compile(r"\{\{([a-z_]+)\}\}")

def validate_template(value):
    if len(value) > 12000:
        raise HTTPException(422,"Template exceeds 12,000 characters")
    tokens=set(TOKEN_RE.findall(value))
    if not tokens.issubset(ALLOWED_TOKENS):
        raise HTTPException(422,"Unsupported placeholder")
    # Email bodies rendered as plain text and escaped by delivery layer.
    return value

def render(value, data):
    return TOKEN_RE.sub(lambda m: str(data.get(m.group(1),"")),value)

def enqueue_notice(db, user, template_key, data):
    """Create an in-app notice, deliver matching user-facing email and log outcome.
    Called only after an authorized event. No email is sent to unverified accounts.
    """
    template=db.query(EmailTemplate).filter_by(key=template_key).first()
    defaults=TEMPLATE_DEFAULTS.get(template_key)
    if (template and not template.active) or (not template and not defaults):
        return False
    english=user.preferred_language=="en"
    subject=(template.subject_en if english else template.subject_sq) if template else defaults[1 if english else 0]
    body=(template.body_en if english else template.body_sq) if template else defaults[3 if english else 2]
    subject=render(subject,data)
    body=render(body,data)
    db.add(Notification(user_id=user.id,type=template_key,title=subject[:250],
                        message=body[:1500],data={"link":str(data.get("link",""))[:300]}))
    db.flush()
    sent=False
    if user.is_active and user.is_verified:
        try:
            # The current mailer treats 'body' as HTML: escape all submitted content.
            sent=email_service.send_notification_email(user.email,html.escape(subject),
                                                       html.escape(body).replace("\n","<br>"))
        except Exception:
            sent=False
    db.add(EmailDeliveryLog(template_key=template_key,recipient_user_id=user.id,
                            status="sent" if sent else "failed",
                            error_code=None if sent else "DELIVERY_UNAVAILABLE",
                            sent_at=datetime.utcnow() if sent else None))
    return sent
