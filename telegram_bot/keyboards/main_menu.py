from aiogram.types import KeyboardButton, ReplyKeyboardMarkup

MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="📋 Bugungi vazifalar"), KeyboardButton(text="📅 Bu hafta")],
        [KeyboardButton(text="📊 Statistika"), KeyboardButton(text="➕ Yangi vazifa")],
    ],
    resize_keyboard=True,
)
