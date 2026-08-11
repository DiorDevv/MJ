from datetime import UTC, datetime

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

from telegram_bot.db import get_linked_user
from telegram_bot.keyboards.main_menu import MAIN_MENU
from telegram_bot.states.link_states import LinkStates

router = Router()


@router.message(CommandStart())
async def handle_start(message: Message, state: FSMContext) -> None:
    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, message.chat.id)

    if user is not None:
        await state.clear()
        await message.answer(f"Xush kelibsiz, {user.username}! 👋", reply_markup=MAIN_MENU)
        return

    await state.set_state(LinkStates.waiting_for_code)
    await message.answer(
        "Salom! 👋 MJ botiga xush kelibsiz.\n\n"
        'Hisobingizni bog\'lash uchun saytda "Telegram ulash" tugmasini bosing '
        "va u yerda ko'rsatilgan 6 xonali kodni shu yerga yuboring."
    )


@router.message(LinkStates.waiting_for_code)
async def handle_link_code(message: Message, state: FSMContext) -> None:
    code = (message.text or "").strip()
    if not code.isdigit() or len(code) != 6:
        await message.answer("Kod 6 ta raqamdan iborat bo'lishi kerak. Qaytadan urinib ko'ring.")
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.telegram_link_code == code))
        user = result.scalar_one_or_none()

        if (
            user is None
            or user.telegram_link_code_expires_at is None
            or user.telegram_link_code_expires_at < datetime.now(UTC)
        ):
            await message.answer(
                "Kod noto'g'ri yoki muddati tugagan (5 daqiqa amal qiladi). "
                "Saytdan yangi kod oling."
            )
            return

        chat_owner = await get_linked_user(db, message.chat.id)
        if chat_owner is not None and chat_owner.id != user.id:
            await message.answer("Bu Telegram hisobi allaqachon boshqa MJ hisobiga ulangan.")
            return

        if user.telegram_chat_id is not None and user.telegram_chat_id != message.chat.id:
            await message.answer("Bu MJ hisobi allaqachon boshqa Telegram hisobiga ulangan.")
            return

        user.telegram_chat_id = message.chat.id
        user.telegram_link_code = None
        user.telegram_link_code_expires_at = None
        await db.commit()
        username = user.username

    await state.clear()
    await message.answer(
        f"Hisobingiz muvaffaqiyatli bog'landi, {username}! ✅", reply_markup=MAIN_MENU
    )
