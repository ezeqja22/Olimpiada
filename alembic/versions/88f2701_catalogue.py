"""Add weekly scores, the olympiad guide, and protected library files."""
import json
from pathlib import Path

import sqlalchemy as sa
from alembic import op

revision = "88f2701"
down_revision = "77f26f3"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("weekly_submissions") as batch:
        batch.add_column(sa.Column("score", sa.Integer()))
        batch.create_check_constraint("ck_weekly_submission_score", "score BETWEEN 1 AND 10")

    with op.batch_alter_table("library_documents") as batch:
        batch.add_column(sa.Column("kind", sa.String(20), nullable=False, server_default="book"))
        batch.add_column(sa.Column("discipline", sa.String(100)))
        batch.add_column(sa.Column("description", sa.Text(), nullable=False, server_default=""))
        batch.add_column(sa.Column("author", sa.String(250), nullable=False, server_default=""))
        batch.add_column(sa.Column("visible", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.execute("UPDATE library_documents SET kind = category WHERE category IN ('booklet', 'magazine', 'training')")

    op.create_table("library_files",
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("library_documents.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("content", sa.LargeBinary(), nullable=False))
    guides = op.create_table("olympiad_guides",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("name", sa.String(250), nullable=False),
        sa.Column("acronym", sa.String(30), nullable=False),
        sa.Column("subject", sa.String(80), nullable=False),
        sa.Column("scope", sa.String(30), nullable=False),
        sa.Column("audience", sa.String(180), nullable=False),
        sa.Column("importance", sa.Text(), nullable=False),
        sa.Column("history", sa.Text(), nullable=False),
        sa.Column("steps", sa.JSON(), nullable=False),
        sa.Column("source_url", sa.String(500), nullable=False),
        sa.Column("local_url", sa.String(500)),
        sa.Column("published", sa.Boolean(), nullable=False))
    if op.get_context().dialect.name == "postgresql":
        for table in ("library_files", "olympiad_guides"):
            op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")

    seed = Path(__file__).with_name("olympiad_guides.json")
    op.bulk_insert(guides, json.loads(seed.read_text(encoding="utf-8")))


def downgrade():
    op.drop_table("olympiad_guides")
    op.drop_table("library_files")
    with op.batch_alter_table("library_documents") as batch:
        for column in ("visible", "author", "description", "discipline", "kind"):
            batch.drop_column(column)
    with op.batch_alter_table("weekly_submissions") as batch:
        batch.drop_constraint("ck_weekly_submission_score", type_="check")
        batch.drop_column("score")
