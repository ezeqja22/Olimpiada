"""Phase 3: teacher vetting, scoped classes, notification templates, support, FAQ and branding.

Revision ID: 44f26c3
Revises: 33f26b2
"""
from alembic import op
import sqlalchemy as sa

revision = "44f26c3"
down_revision = "33f26b2"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("teacher_applications",
        sa.Column("id",sa.Integer(),primary_key=True),
        sa.Column("user_id",sa.Integer(),sa.ForeignKey("users.id"),unique=True,nullable=False),
        sa.Column("first_name",sa.String(90),nullable=False),
        sa.Column("last_name",sa.String(90),nullable=False),
        sa.Column("birth_date",sa.Date(),nullable=False),
        sa.Column("bio",sa.Text(),nullable=False),
        sa.Column("subject",sa.String(100),nullable=False),
        sa.Column("id_photo_key",sa.String(250),nullable=False),
        sa.Column("portrait_key",sa.String(250),nullable=False),
        sa.Column("status",sa.String(20),nullable=False,server_default="pending"),
        sa.Column("submitted_at",sa.DateTime(),nullable=False),
        sa.Column("reviewed_by",sa.Integer(),sa.ForeignKey("users.id")),
        sa.Column("reviewed_at",sa.DateTime()),
        sa.Column("review_note",sa.Text()))
    op.create_table("teacher_forum_assignments",
        sa.Column("id",sa.Integer(),primary_key=True),
        sa.Column("teacher_id",sa.Integer(),sa.ForeignKey("users.id"),nullable=False),
        sa.Column("forum_id",sa.Integer(),sa.ForeignKey("forums.id"),nullable=False),
        sa.Column("assigned_by",sa.Integer(),sa.ForeignKey("users.id"),nullable=False),
        sa.Column("created_at",sa.DateTime(),nullable=False),
        sa.UniqueConstraint("teacher_id","forum_id",name="uq_teacher_forum"))
    op.add_column("course_items",sa.Column("forum_id",sa.Integer(),sa.ForeignKey("forums.id"),nullable=True))
    op.create_table("email_templates",
        sa.Column("id",sa.Integer(),primary_key=True),
        sa.Column("key",sa.String(80),nullable=False,unique=True),
        sa.Column("subject_sq",sa.String(250),nullable=False),
        sa.Column("subject_en",sa.String(250),nullable=False),
        sa.Column("body_sq",sa.Text(),nullable=False),
        sa.Column("body_en",sa.Text(),nullable=False),
        sa.Column("active",sa.Boolean(),nullable=False,server_default=sa.true()),
        sa.Column("updated_by",sa.Integer(),sa.ForeignKey("users.id")) )
    op.create_table("email_delivery_logs",
        sa.Column("id",sa.Integer(),primary_key=True),
        sa.Column("template_key",sa.String(80),nullable=False),
        sa.Column("recipient_user_id",sa.Integer(),sa.ForeignKey("users.id"),nullable=False),
        sa.Column("status",sa.String(20),nullable=False),
        sa.Column("error_code",sa.String(60)),
        sa.Column("sent_at",sa.DateTime()))
    op.create_table("parent_student_links",
        sa.Column("id",sa.Integer(),primary_key=True),
        sa.Column("parent_id",sa.Integer(),sa.ForeignKey("users.id"),nullable=False),
        sa.Column("student_id",sa.Integer(),sa.ForeignKey("users.id"),nullable=False),
        sa.Column("status",sa.String(20),nullable=False,server_default="pending"),
        sa.Column("created_at",sa.DateTime(),nullable=False),
        sa.Column("reviewed_by",sa.Integer(),sa.ForeignKey("users.id")),
        sa.UniqueConstraint("parent_id","student_id",name="uq_parent_student"))
    op.create_table("support_tickets",
        sa.Column("id",sa.Integer(),primary_key=True),
        sa.Column("user_id",sa.Integer(),sa.ForeignKey("users.id")),
        sa.Column("name",sa.String(120),nullable=False),
        sa.Column("email",sa.String(254),nullable=False),
        sa.Column("category",sa.String(50),nullable=False),
        sa.Column("subject",sa.String(200),nullable=False),
        sa.Column("message",sa.Text(),nullable=False),
        sa.Column("status",sa.String(20),nullable=False,server_default="open"),
        sa.Column("admin_response",sa.Text()),
        sa.Column("created_at",sa.DateTime(),nullable=False),
        sa.Column("updated_at",sa.DateTime(),nullable=False))
    op.create_table("faq_entries",
        sa.Column("id",sa.Integer(),primary_key=True),
        sa.Column("category",sa.String(60),nullable=False),
        sa.Column("question_sq",sa.String(300),nullable=False),
        sa.Column("answer_sq",sa.Text(),nullable=False),
        sa.Column("question_en",sa.String(300),nullable=False),
        sa.Column("answer_en",sa.Text(),nullable=False),
        sa.Column("position",sa.Integer(),nullable=False,server_default="0"),
        sa.Column("active",sa.Boolean(),nullable=False,server_default=sa.true()))
    op.create_table("site_content_blocks",
        sa.Column("key",sa.String(100),primary_key=True),
        sa.Column("title_sq",sa.String(250),nullable=False),
        sa.Column("title_en",sa.String(250),nullable=False),
        sa.Column("subtitle_sq",sa.Text(),nullable=False),
        sa.Column("subtitle_en",sa.Text(),nullable=False),
        sa.Column("image_url",sa.Text()),
        sa.Column("button_url",sa.String(500)),
        sa.Column("updated_at",sa.DateTime(),nullable=False))
def downgrade():
    op.drop_table("site_content_blocks")
    op.drop_table("faq_entries")
    op.drop_table("support_tickets")
    op.drop_table("parent_student_links")
    op.drop_table("email_delivery_logs")
    op.drop_table("email_templates")
    op.drop_column("course_items","forum_id")
    op.drop_table("teacher_forum_assignments")
    op.drop_table("teacher_applications")
