"""Seed editable FAQ entries without overwriting existing content.
Revision ID: 77f26f3
Revises: 66f26e3
"""
from alembic import op
import sqlalchemy as sa

revision = "77f26f3"
down_revision = "66f26e3"
branch_labels = None
depends_on = None

FAQ = [
  {
    "category": "Abonimet", "question_sq": "Si aktivizohet një abonim?",
    "answer_sq": "Zgjidh planin, ngarko mandatin e pagesës dhe prit miratimin.",
    "question_en": "How do I activate a subscription?",
    "answer_en": "Choose a plan, upload your payment receipt, and await approval.",
    "position": 10, "active": True
  },
  {
    "category": "Abonimet", "question_sq": "Si funksionon Free Trial?",
    "answer_sq": "Nga faqja Abonimet kliko butonin Aktivizo Free Trial. Nuk fillon automatikisht.",
    "question_en": "How does the free trial work?",
    "answer_en": "On the Subscription page click Activate Free Trial. It never starts automatically.",
    "position": 20, "active": True
  },
  {
    "category": "Problema e Javës", "question_sq": "Si dorëzoj një zgjidhje?",
    "answer_sq": "Hyr në llogari, hap Problemen e Javës dhe dorëzo tekstin ose fotografinë/PDF-në.",
    "question_en": "How can I submit a weekly solution?",
    "answer_en": "Sign in, open Problem of the Week, and send a text, photo or PDF solution.",
    "position": 30, "active": True
  },
  {
    "category": "Testet", "question_sq": "Si funksionon kohëmatësi i testeve?",
    "answer_sq": "Kohëmatësi nis kur hap testin; serveri kontrollon afatin dhe dorëzimin.",
    "question_en": "How do timed tests work?",
    "answer_en": "The timer starts when you open a test; the server enforces the deadline.",
    "position": 40, "active": True
  },
  {
    "category": "Biblioteka", "question_sq": "Si mund t'i lexoj materialet e bibliotekës?",
    "answer_sq": "Materialet hapen me abonim aktiv dhe lexohen në viewer-in e platformës.",
    "question_en": "How can I access library documents?",
    "answer_en": "An active subscription enables reading in the platform's document viewer.",
    "position": 50, "active": True
  },
  {
    "category": "Forumet", "question_sq": "Pse nuk mund të hyj në një forum?",
    "answer_sq": "Forumi mund të kërkojë plan më të lartë ose ftesë nga administratori.",
    "question_en": "Why is a forum locked?",
    "answer_en": "The forum may require a higher subscription plan or an invitation.",
    "position": 60, "active": True
  }
]
def upgrade():
    bind=op.get_bind()
    if bind.execute(sa.text("SELECT COUNT(*) FROM faq_entries")).scalar_one():
        return
    table=sa.table("faq_entries",
        sa.column("category",sa.String),
        sa.column("question_sq",sa.String),
        sa.column("answer_sq",sa.Text),
        sa.column("question_en",sa.String),
        sa.column("answer_en",sa.Text),
        sa.column("position",sa.Integer),
        sa.column("active",sa.Boolean))
    op.bulk_insert(table,FAQ)

def downgrade():
    # Preserve user-edited FAQ content instead of deleting it on a rollback.
    pass
