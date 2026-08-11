import uuid

from aiogram import F, Router
from aiogram.types import CallbackQuery, Message
from app.db.session import AsyncSessionLocal
from app.exceptions import TaskNotFoundError
from app.schemas.task import SnoozeRequest
from app.services import task_service

from telegram_bot.db import get_linked_user

router = Router()


@router.callback_query(F.data.startswith("complete:"))
async def handle_complete(callback: CallbackQuery) -> None:
    if not isinstance(callback.data, str):
        return
    task_id = callback.data.split(":", 1)[1]

    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, callback.from_user.id)
        if user is None:
            await callback.answer("Hisobingiz bog'lanmagan.", show_alert=True)
            return
        try:
            await task_service.complete_task(db, user.id, uuid.UUID(task_id))
        except (TaskNotFoundError, ValueError):
            await callback.answer("Vazifa topilmadi.", show_alert=True)
            return

    await callback.answer("✅ Bajarildi deb belgilandi!")
    if isinstance(callback.message, Message):
        await callback.message.edit_reply_markup(reply_markup=None)


@router.callback_query(F.data.startswith("snooze:"))
async def handle_snooze(callback: CallbackQuery) -> None:
    if not isinstance(callback.data, str):
        return
    task_id = callback.data.split(":", 1)[1]

    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, callback.from_user.id)
        if user is None:
            await callback.answer("Hisobingiz bog'lanmagan.", show_alert=True)
            return
        try:
            await task_service.snooze_task(
                db, user.id, uuid.UUID(task_id), SnoozeRequest(preset="1h")
            )
        except (TaskNotFoundError, ValueError):
            await callback.answer("Vazifa topilmadi.", show_alert=True)
            return

    await callback.answer("⏰ 1 soatga kechiktirildi!")
    if isinstance(callback.message, Message):
        await callback.message.edit_reply_markup(reply_markup=None)
