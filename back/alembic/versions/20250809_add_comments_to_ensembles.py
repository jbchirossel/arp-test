"""Add comments column to ensembles

Revision ID: 20250809_add_comments
Revises: 519377ec7eb3
Create Date: 2025-08-09 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250809_add_comments'
down_revision = '519377ec7eb3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('ensembles', sa.Column('comments', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('ensembles', 'comments')
