"""add year to tasks

Revision ID: add_year_to_tasks
Revises: add_fec_analysis_tables
Create Date: 2025-10-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_year_to_tasks'
down_revision = 'add_fec_analysis_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ajouter la colonne year avec une valeur par défaut de 2025
    op.add_column('tasks', sa.Column('year', sa.Integer(), nullable=False, server_default='2025'))


def downgrade() -> None:
    # Supprimer la colonne year
    op.drop_column('tasks', 'year')

