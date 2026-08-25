import uuid

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from app.models.category import Category
from app.models.enums import Priority

PRIORITY_LABELS_UZ = {
    Priority.LOW.value: "🟢 Past",
    Priority.MEDIUM.value: "🟡 O'rta",
    Priority.HIGH.value: "🔴 Yuqori",
}


def category_keyboard(categories: list[Category]) -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text=category.name, callback_data=f"cat:{category.id}")]
        for category in categories
    ]
    buttons.append([InlineKeyboardButton(text="Kategoriyasiz", callback_data="cat:none")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def priority_keyboard() -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(text=label, callback_data=f"priority:{value}")]
        for value, label in PRIORITY_LABELS_UZ.items()
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def undo_keyboard(task_id: uuid.UUID) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="↩️ Bekor qilish", callback_data=f"undo_add:{task_id}")]
        ]
    )


def voice_task_keyboard(task_id: uuid.UUID) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🎙 Eshitish", callback_data=f"play_voice:{task_id}"),
                InlineKeyboardButton(text="↩️ Bekor qilish", callback_data=f"undo_add:{task_id}"),
            ]
        ]
    )


def voice_date_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Bugun", callback_data="voicedate:today"),
                InlineKeyboardButton(text="Ertaga", callback_data="voicedate:tomorrow"),
            ],
            [InlineKeyboardButton(text="📅 Sana kiritish", callback_data="voicedate:custom")],
        ]
    )


def confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Tasdiqlash", callback_data="confirm:yes"),
                InlineKeyboardButton(text="❌ Bekor qilish", callback_data="confirm:no"),
            ]
        ]
    )
