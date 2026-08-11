import uuid

from pydantic import BaseModel, ConfigDict, Field

COLOR_PATTERN = r"^#[0-9A-Fa-f]{6}$"


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str = Field(pattern=COLOR_PATTERN)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    color: str | None = Field(default=None, pattern=COLOR_PATTERN)


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    color: str
