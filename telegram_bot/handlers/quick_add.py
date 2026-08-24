import html
import logging
import re
import uuid
from datetime import date, time, timedelta

from aiogram import Bot, F, Router
from aiogram.filters import StateFilter
from aiogram.types import CallbackQuery, Message
from app.db.session import AsyncSessionLocal
from app.exceptions import TaskNotFoundError
from app.schemas.task import TaskCreate
from app.services import task_service

from telegram_bot.db import get_linked_user
from telegram_bot.keyboards.inline import undo_keyboard
from telegram_bot.stt import MAX_VOICE_SECONDS, TranscriptionUnavailableError, transcribe_voice

logger = logging.getLogger(__name__)

router = Router()

NOT_LINKED_MESSAGE = "Avval /start orqali hisobingizni bog'lang."

_TIME_PATTERN = re.compile(r"\b([01]?\d|2[0-3]):([0-5]\d)\b")
_TOMORROW_PATTERN = re.compile(r"(?i)\bertaga\b")
_TODAY_PATTERN = re.compile(r"(?i)\bbugun\b")


def _extract_date_time_title(text: str) -> tuple[date, str, str]:
    """Pulls an optional 'bugun'/'ertaga' + HH:MM out of free text, defaulting
    to today at 09:00 when absent, and returns the remaining title text."""
    remaining = text
    due_date = date.today()

    if _TOMORROW_PATTERN.search(remaining):
        due_date = date.today() + timedelta(days=1)
        remaining = _TOMORROW_PATTERN.sub("", remaining)
    else:
        remaining = _TODAY_PATTERN.sub("", remaining)

    due_time = "09:00:00"
    time_match = _TIME_PATTERN.search(remaining)
    if time_match:
        due_time = f"{time_match.group(0)}:00"
        remaining = remaining.replace(time_match.group(0), "")

    title = re.sub(r"\s+", " ", remaining).strip(" ,.-")
    return due_date, due_time, title or text.strip()


async def _quick_add_from_text(message: Message, user_id: uuid.UUID, raw_text: str) -> None:
    """Creates the task immediately (no confirm step) and offers a one-tap undo —
    a review-before-commit step made sense when quick-add fed into the multi-field
    guided flow's shared confirm screen, but for a single parsed line it's one more
    round-trip than the mistake rate justifies. Category/priority stay at their
    defaults here; use "➕ Yangi vazifa" for those."""
    due_date, due_time, title = _extract_date_time_title(raw_text)
    if len(title) > 200:
        await message.answer("Sarlavha 200 belgidan oshmasligi kerak. Qaytadan yozing:")
        return

    task_in = TaskCreate(title=title, due_date=due_date, due_time=time.fromisoformat(due_time))
    async with AsyncSessionLocal() as db:
        task = await task_service.create_task(db, user_id, task_in)

    date_label = "bugun" if due_date == date.today() else due_date.strftime("%d.%m.%Y")
    summary = (
        "✅ <b>Vazifa qo'shildi:</b>\n\n"
        f"📝 {html.escape(title)}\n"
        f"📅 {date_label}\n"
        f"🕐 {due_time[:5]}"
    )
    await message.answer(summary, reply_markup=undo_keyboard(task.id))


@router.message(StateFilter(None), F.text, ~F.text.startswith("/"))
async def quick_add_task(message: Message) -> None:
    raw_text = (message.text or "").strip()
    if not raw_text:
        return

    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, message.chat.id)
    if user is None:
        await message.answer(NOT_LINKED_MESSAGE)
        return

    await _quick_add_from_text(message, user.id, raw_text)


@router.message(StateFilter(None), F.voice)
async def quick_add_voice(message: Message, bot: Bot) -> None:
    voice = message.voice
    if voice is None:
        return
    if voice.duration > MAX_VOICE_SECONDS:
        await message.answer(
            f"Ovozli xabar juda uzun (max {MAX_VOICE_SECONDS} soniya). "
            "Qisqaroq yuboring yoki matn bilan yozing."
        )
        return

    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, message.chat.id)
    if user is None:
        await message.answer(NOT_LINKED_MESSAGE)
        return

    await bot.send_chat_action(message.chat.id, "typing")
    try:
        raw_text = await transcribe_voice(bot, voice)
    except TranscriptionUnavailableError:
        logger.exception("Ovozli xabarni tanib bo'lmadi: chat_id=%s", message.chat.id)
        await message.answer("🎙 Ovozli xabarni tanib bo'lmadi. Iltimos, matn bilan yozib ko'ring.")
        return

    await message.answer(f"🎙 Eshitdim: «{html.escape(raw_text)}»")
    await _quick_add_from_text(message, user.id, raw_text)


@router.callback_query(F.data.startswith("undo_add:"))
async def undo_quick_add(callback: CallbackQuery) -> None:
    if not isinstance(callback.data, str):
        return
    task_id = callback.data.split(":", 1)[1]

    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, callback.from_user.id)
        if user is None:
            await callback.answer("Hisobingiz bog'lanmagan.", show_alert=True)
            return
        try:
            await task_service.delete_task(db, user.id, uuid.UUID(task_id))
        except (TaskNotFoundError, ValueError):
            await callback.answer("Vazifa allaqachon o'chirilgan yoki topilmadi.", show_alert=True)
            return

    await callback.answer("↩️ Bekor qilindi.")
    if isinstance(callback.message, Message):
        await callback.message.edit_text("❌ Vazifa bekor qilindi.")
