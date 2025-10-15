"""create task checklist and assignments tables

Revision ID: create_task_checklist_and_assignments
Revises: add_year_to_tasks
Create Date: 2025-10-01 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'create_task_checklist_and_assignments'
down_revision = 'add_year_to_tasks'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Créer la table task_checklist_items
    op.create_table(
        'task_checklist_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('text', sa.String(), nullable=False),
        sa.Column('done', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_checklist_items_id'), 'task_checklist_items', ['id'], unique=False)
    
    # Créer la table user_assignments
    op.create_table(
        'user_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('done', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_assignments_id'), 'user_assignments', ['id'], unique=False)


def downgrade() -> None:
    # Supprimer les tables
    op.drop_index(op.f('ix_user_assignments_id'), table_name='user_assignments')
    op.drop_table('user_assignments')
    op.drop_index(op.f('ix_task_checklist_items_id'), table_name='task_checklist_items')
    op.drop_table('task_checklist_items')

