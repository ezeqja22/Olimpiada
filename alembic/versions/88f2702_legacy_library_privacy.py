"""Keep fileless legacy library entries private; preserve their records.

Rollback restores only the old default, never republishes hidden records.
"""
import sqlalchemy as sa
from alembic import op
revision = '88f2702'
down_revision = '88f2701'
branch_labels = None
depends_on = None

def upgrade():
    op.execute('UPDATE library_documents SET visible = false WHERE NOT EXISTS (SELECT 1 FROM library_files WHERE library_files.document_id = library_documents.id)')
    with op.batch_alter_table('library_documents') as batch:
        batch.alter_column('visible', existing_type=sa.Boolean(), server_default=sa.false())

def downgrade():
    with op.batch_alter_table('library_documents') as batch:
        batch.alter_column('visible', existing_type=sa.Boolean(), server_default=sa.true())
