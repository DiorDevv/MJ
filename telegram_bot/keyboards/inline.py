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


def confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Tasdiqlash", callback_data="confirm:yes"),
                InlineKeyboardButton(text="❌ Bekor qilish", callback_data="confirm:no"),
            ]
        ]
    )
