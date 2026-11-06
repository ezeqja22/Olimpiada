"""Phase 3: grading and idempotent notification dispatch.
Revision ID: 55f26d3
Revises: 44f26c3
"""
from alembic import op
import sqlalchemy as sa
revision="55f26d3"
down_revision="44f26c3"
branch_labels=None
depends_on=None
def upgrade():
    op.add_column("course_attempts",sa.Column("score",sa.Integer(),nullable=True))
    op.add_column("course_attempts",sa.Column("feedback",sa.Text(),nullable=True))
    op.add_column("course_attempts",sa.Column("graded_at",sa.DateTime(),nullable=True))
    op.create_table("content_event_deliveries",
        sa.Column("id",sa.Integer(),primary_key=True),
        sa.Column("event_key",sa.String(150),nullable=False),
        sa.Column("recipient_user_id",sa.Integer(),sa.ForeignKey("users.id"),nullable=False),
        sa.Column("created_at",sa.DateTime(),nullable=False),
        sa.UniqueConstraint("event_key","recipient_user_id",name="uq_content_event_user"))
def downgrade():
    op.drop_table("content_event_deliveries")
    op.drop_column("course_attempts","graded_at")
    op.drop_column("course_attempts","feedback")
    op.drop_column("course_attempts","score")
