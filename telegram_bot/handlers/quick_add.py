import asyncio
import html
import logging
import re
import uuid
from datetime import date, datetime, time, timedelta

from aiogram import Bot, F, Router
from aiogram.filters import StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, FSInputFile, Message
from app.db.session import AsyncSessionLocal
from app.exceptions import TaskNotFoundError
from app.models.category import Category
from app.models.enums import Priority
from app.schemas.task import TaskCreate, TaskUpdate
from app.services import category_service, task_service
from app.services.voice_note_service import save_voice_note, voice_note_file_path

from telegram_bot.db import get_linked_user
from telegram_bot.keyboards.inline import (
    PRIORITY_LABELS_UZ,
    undo_keyboard,
    voice_date_keyboard,
    voice_task_keyboard,
)
from telegram_bot.states.voice_states import VoiceQuickAddStates
from telegram_bot.stt import (
    MAX_VOICE_SECONDS,
    TranscriptionUnavailableError,
    download_voice_bytes,
    transcribe_voice,
)

logger = logging.getLogger(__name__)

router = Router()

NOT_LINKED_MESSAGE = "Avval /start orqali hisobingizni bog'lang."

_TIME_PATTERN = re.compile(r"\b([01]?\d|2[0-3]):([0-5]\d)\b")
_TOMORROW_PATTERN = re.compile(r"(?i)\bertaga\b")
_TODAY_PATTERN = re.compile(r"(?i)\bbugun\b")

# One shared date/time/priority/category applies to the whole message; only the
# remaining text is split into separate task titles. A per-segment "ertaga 14:00
# sut olish, 18:00 non olish" syntax would be more flexible but far more prone to
# silent misparsing — a shared list ("ertaga 18:00 sut olish, non olish") matches
# how people actually dictate or type a list.
_SEGMENT_SPLIT_PATTERN = re.compile(r"[\n,]+")

_PRIORITY_KEYWORDS: dict[str, Priority] = {
    "past": Priority.LOW,
    "yuqori": Priority.HIGH,
    "muhim": Priority.HIGH,
    "shoshilinch": Priority.HIGH,
    "orta": Priority.MEDIUM,
    "o'rta": Priority.MEDIUM,
}
_PRIORITY_PATTERN = re.compile(
    r"(?i)!(" + "|".join(re.escape(word) for word in _PRIORITY_KEYWORDS) + r")\b"
)
_CATEGORY_TAG_PATTERN = re.compile(r"#(\S+)")

MAX_TITLE_LENGTH = 200


def _clean_title(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip(" ,.-")


class ParsedQuickAdd:
    def __init__(
        self,
        due_date: date,
        due_time: str,
        priority: Priority,
        category: Category | None,
        titles: list[str],
    ) -> None:
        self.due_date = due_date
        self.due_time = due_time
        self.priority = priority
        self.category = category
        self.titles = titles


def _parse_quick_add(raw_text: str, categories: list[Category]) -> ParsedQuickAdd:
    """Extracts an optional 'bugun'/'ertaga' + HH:MM + '!priority' + '#category'
    shared across the whole message, then splits whatever's left into one title
    per line/comma-separated item — so "ertaga 18:00 !muhim #uy sut olish, non
    olish" becomes two high-priority tasks tomorrow at 18:00 tagged #uy."""
    remaining = raw_text
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

    priority = Priority.MEDIUM
    priority_match = _PRIORITY_PATTERN.search(remaining)
    if priority_match:
        priority = _PRIORITY_KEYWORDS[priority_match.group(1).lower()]
        remaining = remaining.replace(priority_match.group(0), "")

    category: Category | None = None
    category_match = _CATEGORY_TAG_PATTERN.search(remaining)
    if category_match:
        tag = category_match.group(1).lower()
        category = next((c for c in categories if c.name.lower() == tag), None)
        if category is not None:
            remaining = remaining.replace(category_match.group(0), "")

    titles = [_clean_title(segment) for segment in _SEGMENT_SPLIT_PATTERN.split(remaining)]
    titles = [title for title in titles if title]
    if not titles:
        titles = [raw_text.strip()]

    return ParsedQuickAdd(due_date, due_time, priority, category, titles)


async def _quick_add_from_text(
    message: Message, user_id: uuid.UUID, raw_text: str, *, voice_note_path: str | None = None
) -> None:
    """Creates the task(s) immediately (no confirm step) — a review-before-commit
    step made sense when quick-add fed into the multi-field guided flow's shared
    confirm screen, but is one extra round-trip per message than the mistake rate
    justifies. A single created task gets an undo button; a batch doesn't (no way
    to fit N task ids in Telegram's 64-byte callback_data), so batch mistakes are
    cleaned up from the list view instead.

    voice_note_path (set only by quick_add_voice) is attached to every task created
    from a batch — there's one recording for the whole message, not one per title."""
    async with AsyncSessionLocal() as db:
        categories = await category_service.list_categories(db, user_id)
        parsed = _parse_quick_add(raw_text, categories)

        valid_titles = [t for t in parsed.titles if len(t) <= MAX_TITLE_LENGTH]
        skipped = len(parsed.titles) - len(valid_titles)
        if not valid_titles:
            await message.answer("Sarlavha 200 belgidan oshmasligi kerak. Qaytadan yozing:")
            return

        created = []
        for title in valid_titles:
            task_in = TaskCreate(
                title=title,
                due_date=parsed.due_date,
                due_time=time.fromisoformat(parsed.due_time),
                priority=parsed.priority,
                category_id=parsed.category.id if parsed.category else None,
            )
            created.append(
                await task_service.create_task(
                    db, user_id, task_in, voice_note_path=voice_note_path
                )
            )

    is_today = parsed.due_date == date.today()
    date_label = "bugun" if is_today else parsed.due_date.strftime("%d.%m.%Y")
    context_lines = [f"📅 {date_label}", f"🕐 {parsed.due_time[:5]}"]
    if parsed.priority != Priority.MEDIUM:
        context_lines.append(PRIORITY_LABELS_UZ[parsed.priority.value])
    if parsed.category is not None:
        context_lines.append(f"🏷 {html.escape(parsed.category.name)}")

    context = "\n".join(context_lines)
    if len(created) == 1:
        summary = f"✅ <b>Vazifa qo'shildi:</b>\n\n📝 {html.escape(created[0].title)}\n{context}"
        await message.answer(summary, reply_markup=undo_keyboard(created[0].id))
    else:
        lines = "\n".join(f"• {html.escape(task.title)}" for task in created)
        summary = f"✅ <b>{len(created)} ta vazifa qo'shildi:</b>\n\n{lines}\n\n{context}"
        await message.answer(summary)

    if skipped:
        await message.answer(
            f"⚠️ {skipped} ta qator 200 belgidan uzun bo'lgani uchun o'tkazib yuborildi."
        )


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


VOICE_PLACEHOLDER_TITLE = "🎙 Ovozli vazifa"
_VOICE_DEFAULT_TIME = time(9, 0)


def _parse_manual_date(text: str) -> date | None:
    text = text.strip().lower()
    if text == "bugun":
        return date.today()
    if text == "ertaga":
        return date.today() + timedelta(days=1)
    try:
        return datetime.strptime(text, "%d.%m.%Y").date()
    except ValueError:
        return None


@router.message(StateFilter(None), F.voice)
async def quick_add_voice(message: Message, bot: Bot, state: FSMContext) -> None:
    """Self-hosted CPU transcription (see telegram_bot/stt.py) is too slow and too
    unreliable — a cold model load alone can take well over a minute — to sit on the
    critical path of "user just wants a task saved fast". So this only downloads and
    saves the recording, then asks a single quick question (which day) via buttons
    to get a usable due date without depending on STT at all. The real transcription
    still runs, just afterwards and in the background (see _enrich_voice_task_title)
    as a best-effort title upgrade that the user never has to wait on or notice fail."""
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

    try:
        audio_bytes = await download_voice_bytes(bot, voice)
    except TranscriptionUnavailableError:
        logger.exception("Ovozli xabarni yuklab bo'lmadi: chat_id=%s", message.chat.id)
        await message.answer("🎙 Ovozli xabarni yuklab bo'lmadi. Qaytadan urinib ko'ring.")
        return

    voice_note_path = save_voice_note(audio_bytes)
    await state.update_data(voice_note_path=voice_note_path)
    await state.set_state(VoiceQuickAddStates.awaiting_date_choice)
    await message.answer("🎙 Ovozli xabar qabul qilindi. Qachonga?", reply_markup=voice_date_keyboard())


async def _enrich_voice_task_title(user_id: uuid.UUID, task_id: uuid.UUID, voice_note_path: str) -> None:
    """Fire-and-forget background upgrade: swaps the placeholder title for the
    transcribed text if (and only if) STT succeeds in time. Never touches the task's
    date/time/priority — those were already set by the user via the date buttons —
    and any failure here is silent, since the task already exists and the recording
    is already listenable either way."""
    try:
        audio_bytes = voice_note_file_path(voice_note_path).read_bytes()
        raw_text = await transcribe_voice(audio_bytes)
    except (TranscriptionUnavailableError, OSError):
        logger.info("Ovozli vazifa uchun fon transkripsiyasi muvaffaqiyatsiz: task_id=%s", task_id)
        return

    title = _clean_title(raw_text)[:MAX_TITLE_LENGTH]
    if not title:
        return

    async with AsyncSessionLocal() as db:
        try:
            await task_service.update_task(db, user_id, task_id, TaskUpdate(title=title))
        except TaskNotFoundError:
            pass


async def _create_voice_task(
    chat_id: int, due_date: date, voice_note_path: str
) -> tuple[str, uuid.UUID] | None:
    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, chat_id)
        if user is None:
            return None
        task_in = TaskCreate(
            title=VOICE_PLACEHOLDER_TITLE,
            due_date=due_date,
            due_time=_VOICE_DEFAULT_TIME,
            priority=Priority.MEDIUM,
        )
        task = await task_service.create_task(db, user.id, task_in, voice_note_path=voice_note_path)

    asyncio.create_task(_enrich_voice_task_title(user.id, task.id, voice_note_path))

    date_label = "bugun" if due_date == date.today() else due_date.strftime("%d.%m.%Y")
    summary = (
        f"✅ <b>Vazifa qo'shildi:</b>\n\n{VOICE_PLACEHOLDER_TITLE}\n"
        f"📅 {date_label}\n🕐 {_VOICE_DEFAULT_TIME.strftime('%H:%M')}"
    )
    return summary, task.id


@router.callback_query(VoiceQuickAddStates.awaiting_date_choice, F.data.startswith("voicedate:"))
async def voice_date_chosen(callback: CallbackQuery, state: FSMContext) -> None:
    if not isinstance(callback.data, str):
        return
    choice = callback.data.split(":", 1)[1]

    if choice == "custom":
        await state.set_state(VoiceQuickAddStates.awaiting_custom_date)
        if isinstance(callback.message, Message):
            await callback.message.edit_text(
                "Sanani kiriting (masalan 25.12.2026) yoki 'bugun'/'ertaga' deb yozing:"
            )
        await callback.answer()
        return

    data = await state.get_data()
    voice_note_path = data.get("voice_note_path")
    await state.clear()
    chat_id = callback.message.chat.id if isinstance(callback.message, Message) else None
    if chat_id is None or voice_note_path is None:
        await callback.answer()
        return

    due_date = date.today() if choice == "today" else date.today() + timedelta(days=1)
    result = await _create_voice_task(chat_id, due_date, voice_note_path)
    if result is not None and isinstance(callback.message, Message):
        summary, task_id = result
        await callback.message.edit_text(summary, reply_markup=voice_task_keyboard(task_id))
    await callback.answer()


@router.message(VoiceQuickAddStates.awaiting_custom_date)
async def voice_custom_date_entered(message: Message, state: FSMContext) -> None:
    due_date = _parse_manual_date(message.text or "")
    if due_date is None:
        await message.answer("Sana formati noto'g'ri. Masalan: 25.12.2026, 'bugun' yoki 'ertaga':")
        return

    data = await state.get_data()
    voice_note_path = data.get("voice_note_path")
    await state.clear()
    if voice_note_path is None:
        return

    result = await _create_voice_task(message.chat.id, due_date, voice_note_path)
    if result is not None:
        summary, task_id = result
        await message.answer(summary, reply_markup=voice_task_keyboard(task_id))


@router.callback_query(F.data.startswith("play_voice:"))
async def play_voice_note(callback: CallbackQuery) -> None:
    if not isinstance(callback.data, str):
        return
    task_id = callback.data.split(":", 1)[1]

    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, callback.from_user.id)
        if user is None:
            await callback.answer("Hisobingiz bog'lanmagan.", show_alert=True)
            return
        try:
            task = await task_service.get_task(db, user.id, uuid.UUID(task_id))
        except (TaskNotFoundError, ValueError):
            await callback.answer("Vazifa topilmadi.", show_alert=True)
            return

    if task.voice_note_path is None:
        await callback.answer("Bu vazifada ovozli xabar yo'q.", show_alert=True)
        return

    file_path = voice_note_file_path(task.voice_note_path)
    if not file_path.is_file():
        await callback.answer("Ovozli xabar topilmadi.", show_alert=True)
        return

    await callback.answer()
    if isinstance(callback.message, Message):
        await callback.message.answer_voice(FSInputFile(file_path))


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
