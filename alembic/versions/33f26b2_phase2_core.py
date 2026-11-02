"""Phase 2: weekly competitions, scheduled course items and protected library.
Revision ID: 33f26b2
Revises: 22f26a1
"""
from alembic import op
import sqlalchemy as sa
revision = "33f26b2"
down_revision = "22f26a1"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("forums", sa.Column("required_plan", sa.String(length=20), nullable=False, server_default="basic"))
    op.create_table("weekly_challenges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("week_date", sa.String(length=10), unique=True, nullable=False),
        sa.Column("problem_id", sa.Integer(), sa.ForeignKey("problems.id"), nullable=False),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("closes_at", sa.DateTime(), nullable=False),
        sa.Column("official_solution", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("published_at", sa.DateTime()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False))
    op.create_table("weekly_submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("challenge_id", sa.Integer(), sa.ForeignKey("weekly_challenges.id"), nullable=False),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=False),
        sa.Column("file_key", sa.String(length=250)),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("review_note", sa.Text()),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("reviewed_at", sa.DateTime()),
        sa.Column("submitted_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("challenge_id", "student_id", name="uq_weekly_student"))
    op.create_table("course_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=250), nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=False),
        sa.Column("due_at", sa.DateTime()),
        sa.Column("duration_minutes", sa.Integer()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False))
    op.create_table("course_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("course_items.id"), nullable=False),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("submitted_at", sa.DateTime()),
        sa.Column("answers", sa.Text(), nullable=False),
        sa.UniqueConstraint("item_id", "student_id", name="uq_attempt_per_student_item"))
    op.create_table("library_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=250), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=False),
        sa.Column("level", sa.String(length=30), nullable=False),
        sa.Column("olympiad", sa.String(length=100)),
        sa.Column("year", sa.Integer()),
        sa.Column("storage_key", sa.String(length=250), nullable=False),
        sa.Column("page_count", sa.Integer(), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False))

def downgrade():
    for table in ("library_documents","course_attempts","course_items","weekly_submissions","weekly_challenges"):
        op.drop_table(table)
    op.drop_column("forums","required_plan")
