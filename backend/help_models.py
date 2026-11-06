"""ORM mappings for the *already migrated* FAQ and support tables.

Keep these mappings on separate metadata so the legacy application's automatic
``models.Base.metadata.create_all`` cannot silently create production tables.
This stage deliberately ships no database migrations.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import declarative_base


HelpBase = declarative_base()


class FaqEntry(HelpBase):
    __tablename__ = "faq_entries"

    id = Column(Integer, primary_key=True)
    category = Column(String(60), nullable=False)
    question_sq = Column(String(300), nullable=False)
    answer_sq = Column(Text, nullable=False)
    question_en = Column(String(300), nullable=False)
    answer_en = Column(Text, nullable=False)
    position = Column(Integer, default=0, nullable=False)
    active = Column(Boolean, default=True, nullable=False)


class SupportTicket(HelpBase):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)  # DB has an existing users.id FK.
    name = Column(String(120), nullable=False)
    email = Column(String(254), nullable=False)
    category = Column(String(50), nullable=False)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), default="open", nullable=False)
    admin_response = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
