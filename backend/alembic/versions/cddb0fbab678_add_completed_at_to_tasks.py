"""add completed_at to tasks

Revision ID: cddb0fbab678
Revises: 5377ef585df6
Create Date: 2026-09-09 13:18:04.189044

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "cddb0fbab678"
down_revision: str | None = "5377ef585df6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_tasks_completed_at", "tasks", ["completed_at"])
    # Best-effort backfill so existing history isn't blank on the new analytics:
    # updated_at is the closest signal we have for when a task reached "completed"
    # (exact from here on — see task_service.complete_task).
    # task_status_enum labels are the Python enum member *names* (see
    # app/models/enums.py + the initial migration), i.e. uppercase.
    op.execute("UPDATE tasks SET completed_at = updated_at WHERE status = 'COMPLETED'")


def downgrade() -> None:
    op.drop_index("ix_tasks_completed_at", table_name="tasks")
    op.drop_column("tasks", "completed_at")
