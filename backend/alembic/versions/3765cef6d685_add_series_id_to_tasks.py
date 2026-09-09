"""add series_id to tasks

Revision ID: 3765cef6d685
Revises: cddb0fbab678
Create Date: 2026-09-09 15:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "3765cef6d685"
down_revision: str | None = "cddb0fbab678"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("series_id", sa.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_tasks_series_id", "tasks", ["series_id"])
    # Every existing recurring task becomes its own single-occurrence series.
    # Pre-existing chains aren't retro-linked (there was nothing to link them by);
    # occurrences created from here on share their originator's series_id.
    op.execute(
        "UPDATE tasks SET series_id = id WHERE repeat_type <> 'NONE'"
    )


def downgrade() -> None:
    op.drop_index("ix_tasks_series_id", table_name="tasks")
    op.drop_column("tasks", "series_id")
