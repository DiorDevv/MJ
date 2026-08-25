import uuid
from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from app.models.enums import CreatedVia, Priority, RepeatType, TaskStatus
from app.schemas.category import CategoryRead

SnoozePreset = Literal["15m", "1h", "tomorrow"]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    due_date: date
    due_time: time
    repeat_type: RepeatType = RepeatType.NONE
    category_id: uuid.UUID | None = None
    priority: Priority = Priority.MEDIUM


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    due_date: date | None = None
    due_time: time | None = None
    repeat_type: RepeatType | None = None
    category_id: uuid.UUID | None = None
    priority: Priority | None = None


class SnoozeRequest(BaseModel):
    preset: SnoozePreset | None = None
    snoozed_until: datetime | None = None

    @model_validator(mode="after")
    def check_exactly_one_option(self) -> "SnoozeRequest":
        if (self.preset is None) == (self.snoozed_until is None):
            raise ValueError("Aynan bittasi ko'rsatilishi kerak: 'preset' yoki 'snoozed_until'")
        if self.snoozed_until is not None and self.snoozed_until.tzinfo is None:
            raise ValueError("'snoozed_until' vaqt zonasi bilan (timezone-aware) bo'lishi kerak")
        return self


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    due_date: date
    due_time: time
    repeat_type: RepeatType
    category: CategoryRead | None
    priority: Priority
    status: TaskStatus
    snoozed_until: datetime | None
    created_via: CreatedVia
    created_at: datetime
    updated_at: datetime
    # Populated from the ORM column (from_attributes) but never serialized directly —
    # only whether one exists is exposed. The file itself is served, ownership-checked,
    # via GET /tasks/{id}/voice (see api/v1/tasks.py), not as a raw path here.
    voice_note_path: str | None = Field(default=None, exclude=True, repr=False)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def has_voice_note(self) -> bool:
        return self.voice_note_path is not None


class TaskListResponse(BaseModel):
    items: list[TaskRead]
    total: int
    limit: int
    offset: int
