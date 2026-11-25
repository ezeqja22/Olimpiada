"""Version protected library content for bounded private caches."""
import sqlalchemy as sa
from alembic import op
revision='88f2703'
down_revision='88f2702'
branch_labels=None
depends_on=None

def upgrade():
    op.add_column('library_files',sa.Column('version',sa.String(36),nullable=False,server_default='legacy'))

def downgrade():
    op.drop_column('library_files','version')
