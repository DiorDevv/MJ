import enum


class RepeatType(str, enum.Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    SNOOZED = "snoozed"


class CreatedVia(str, enum.Enum):
    WEB = "web"
    TELEGRAM = "telegram"


class NotificationChannel(str, enum.Enum):
    TELEGRAM = "telegram"
    WEB_PUSH = "web_push"


class NotificationStatus(str, enum.Enum):
    SENT = "sent"
    FAILED = "failed"
