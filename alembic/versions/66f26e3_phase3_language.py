"""Store preferred notification and user interface language.
Revision ID: 66f26e3
Revises: 55f26d3
"""
from alembic import op
import sqlalchemy as sa
revision="66f26e3"
down_revision="55f26d3"
branch_labels=None
depends_on=None
def upgrade():
    op.add_column("users",sa.Column("preferred_language",sa.String(2),nullable=False,server_default="sq"))
def downgrade():
    op.drop_column("users","preferred_language")
