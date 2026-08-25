import uuid

from aiogram import F, Router
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
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
        # A reminder message only ever has one task's buttons, so this clears
        # everything — but this handler also serves the "Tezkor amallar" list
        # keyboard (see menu.py), which packs one row per task into a single
        # message. There, only this task's row (whichever buttons end in
        # ":{task_id}") should disappear; the rest must stay clickable.
        markup = callback.message.reply_markup
        remaining_rows = (
            [
                row
                for row in markup.inline_keyboard
                if not any((btn.callback_data or "").endswith(f":{task_id}") for btn in row)
            ]
            if markup
            else []
        )
        await callback.message.edit_reply_markup(
            reply_markup=InlineKeyboardMarkup(inline_keyboard=remaining_rows) if remaining_rows else None
        )


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
