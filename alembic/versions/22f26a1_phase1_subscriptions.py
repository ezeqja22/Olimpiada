"""Phase 1: session security, subscriptions, receipts, tutoring and expenses.

Revision ID: 22f26a1
Revises: f0035977060e
"""
from alembic import op
import sqlalchemy as sa

revision = "22f26a1"
down_revision = "f0035977060e"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("users", sa.Column("last_activity_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("trial_used_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("trial_expires_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("subscription_plan", sa.String(length=20), nullable=False, server_default="free"))
    op.add_column("users", sa.Column("subscription_expires_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE users SET role = 'student' WHERE role IS NULL OR role = 'user'")
    op.create_table("user_sessions", sa.Column("id", sa.String(length=64), primary_key=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
                    sa.Column("created_at", sa.DateTime(), nullable=False),
                    sa.Column("last_activity_at", sa.DateTime(), nullable=False),
                    sa.Column("revoked_at", sa.DateTime(), nullable=True))
    op.create_index("ix_user_sessions_user", "user_sessions", ["user_id"])
    op.create_table("payment_submissions", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
                    sa.Column("plan", sa.String(length=20), nullable=False),
                    sa.Column("months", sa.Integer(), nullable=False),
                    sa.Column("amount_all", sa.Integer(), nullable=False),
                    sa.Column("receipt_public_id", sa.String(), nullable=False),
                    sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
                    sa.Column("created_at", sa.DateTime(), nullable=False),
                    sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
                    sa.Column("reviewed_at", sa.DateTime(), nullable=True),
                    sa.Column("reviewer_note", sa.Text(), nullable=True))
    op.create_table("teacher_subjects", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
                    sa.Column("subject", sa.String(length=100), nullable=False),
                    sa.UniqueConstraint("teacher_id", "subject", name="uq_teacher_subject"))
    op.create_table("tutoring_requests", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
                    sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
                    sa.Column("subject", sa.String(length=100), nullable=False),
                    sa.Column("message", sa.Text(), nullable=False),
                    sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
                    sa.Column("created_at", sa.DateTime(), nullable=False),
                    sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
                    sa.Column("reviewed_at", sa.DateTime(), nullable=True),
                    sa.Column("admin_note", sa.Text(), nullable=True))
    op.create_table("learning_resources", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("kind", sa.String(length=20), nullable=False),
                    sa.Column("title", sa.String(length=250), nullable=False),
                    sa.Column("subject", sa.String(length=100), nullable=False),
                    sa.Column("body", sa.Text(), nullable=False),
                    sa.Column("scheduled_at", sa.DateTime(), nullable=True))
    op.create_table("monthly_expenses", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("year", sa.Integer(), nullable=False),
                    sa.Column("month", sa.Integer(), nullable=False),
                    sa.Column("category", sa.String(length=100), nullable=False),
                    sa.Column("description", sa.Text(), nullable=False),
                    sa.Column("amount_all", sa.Integer(), nullable=False),
                    sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False))
    op.create_table("annual_report_deliveries", sa.Column("year", sa.Integer(), primary_key=True),
                    sa.Column("sent_at", sa.DateTime(), nullable=True),
                    sa.Column("status", sa.String(length=20), nullable=False))

def downgrade():
    for table in ("annual_report_deliveries", "monthly_expenses", "learning_resources",
                  "tutoring_requests", "teacher_subjects", "payment_submissions", "user_sessions"):
        op.drop_table(table)
    for name in ("subscription_expires_at", "subscription_plan", "trial_expires_at",
                 "trial_used_at", "last_activity_at"):
        op.drop_column("users", name)
