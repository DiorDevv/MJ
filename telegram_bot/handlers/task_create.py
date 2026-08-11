import html
import uuid
from datetime import date, datetime, timedelta

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from app.db.session import AsyncSessionLocal
from app.exceptions import CategoryNotFoundError
from app.models.enums import Priority
from app.schemas.task import TaskCreate
from app.services import category_service, task_service

from telegram_bot.db import get_linked_user
from telegram_bot.keyboards.inline import PRIORITY_LABELS_UZ, category_keyboard, confirm_keyboard
from telegram_bot.keyboards.inline import priority_keyboard as build_priority_keyboard
from telegram_bot.keyboards.main_menu import MAIN_MENU
from telegram_bot.states.task_states import TaskCreateStates

router = Router()

NOT_LINKED_MESSAGE = "Avval /start orqali hisobingizni bog'lang."


def _parse_date(text: str) -> date | None:
    text = text.strip().lower()
    if text == "bugun":
        return date.today()
    if text == "ertaga":
        return date.today() + timedelta(days=1)
    try:
        return datetime.strptime(text, "%d.%m.%Y").date()
    except ValueError:
        return None


def _parse_time(text: str) -> str | None:
    try:
        parsed = datetime.strptime(text.strip(), "%H:%M")
    except ValueError:
        return None
    return parsed.strftime("%H:%M:%S")


@router.message(F.text == "➕ Yangi vazifa")
async def start_task_creation(message: Message, state: FSMContext) -> None:
    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, message.chat.id)
    if user is None:
        await message.answer(NOT_LINKED_MESSAGE)
        return
    await state.set_state(TaskCreateStates.title)
    await message.answer("Vazifa sarlavhasini kiriting:")


@router.message(TaskCreateStates.title)
async def process_title(message: Message, state: FSMContext) -> None:
    title = (message.text or "").strip()
    if not title or len(title) > 200:
        await message.answer("Sarlavha 1-200 belgidan iborat bo'lishi kerak. Qaytadan kiriting:")
        return
    await state.update_data(title=title)
    await state.set_state(TaskCreateStates.due_date)
    await message.answer("Sanani kiriting (masalan 25.12.2026) yoki 'bugun'/'ertaga' deb yozing:")


@router.message(TaskCreateStates.due_date)
async def process_due_date(message: Message, state: FSMContext) -> None:
    parsed_date = _parse_date(message.text or "")
    if parsed_date is None:
        await message.answer("Sana formati noto'g'ri. Masalan: 25.12.2026, 'bugun' yoki 'ertaga':")
        return
    await state.update_data(due_date=parsed_date.isoformat())
    await state.set_state(TaskCreateStates.due_time)
    await message.answer("Vaqtni kiriting (masalan 14:30):")


@router.message(TaskCreateStates.due_time)
async def process_due_time(message: Message, state: FSMContext) -> None:
    parsed_time = _parse_time(message.text or "")
    if parsed_time is None:
        await message.answer("Vaqt formati noto'g'ri. Masalan: 14:30:")
        return
    await state.update_data(due_time=parsed_time)

    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, message.chat.id)
        if user is None:
            await state.clear()
            await message.answer(NOT_LINKED_MESSAGE)
            return
        categories = await category_service.list_categories(db, user.id)

    await state.set_state(TaskCreateStates.category)
    await message.answer("Kategoriyani tanlang:", reply_markup=category_keyboard(categories))


@router.callback_query(TaskCreateStates.category, F.data.startswith("cat:"))
async def process_category(callback: CallbackQuery, state: FSMContext) -> None:
    if not isinstance(callback.data, str):
        return
    value = callback.data.split(":", 1)[1]
    await state.update_data(category_id=None if value == "none" else value)
    await state.set_state(TaskCreateStates.priority)
    if isinstance(callback.message, Message):
        await callback.message.edit_text(
            "Muhimlik darajasini tanlang:", reply_markup=build_priority_keyboard()
        )
    await callback.answer()


@router.callback_query(TaskCreateStates.priority, F.data.startswith("priority:"))
async def process_priority(callback: CallbackQuery, state: FSMContext) -> None:
    if not isinstance(callback.data, str):
        return
    value = callback.data.split(":", 1)[1]
    await state.update_data(priority=value)
    data = await state.get_data()

    summary = (
        "<b>Yangi vazifa:</b>\n\n"
        f"📝 {html.escape(data['title'])}\n"
        f"📅 {data['due_date']}\n"
        f"🕐 {data['due_time'][:5]}\n"
        f"{PRIORITY_LABELS_UZ.get(value, value)}\n\n"
        "Tasdiqlaysizmi?"
    )
    await state.set_state(TaskCreateStates.confirm)
    if isinstance(callback.message, Message):
        await callback.message.edit_text(summary, reply_markup=confirm_keyboard())
    await callback.answer()


@router.callback_query(TaskCreateStates.confirm, F.data == "confirm:yes")
async def process_confirm_yes(callback: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    chat_id = callback.message.chat.id if isinstance(callback.message, Message) else None

    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, chat_id) if chat_id is not None else None
        if user is None:
            await callback.answer("Hisobingiz topilmadi.", show_alert=True)
            await state.clear()
            return

        task_in = TaskCreate(
            title=data["title"],
            due_date=date.fromisoformat(data["due_date"]),
            due_time=datetime.strptime(data["due_time"], "%H:%M:%S").time(),
            category_id=uuid.UUID(data["category_id"]) if data.get("category_id") else None,
            priority=Priority(data["priority"]),
        )
        try:
            await task_service.create_task(db, user.id, task_in)
        except CategoryNotFoundError:
            await state.clear()
            if isinstance(callback.message, Message):
                await callback.message.edit_text("Kategoriya topilmadi. Vazifa bekor qilindi.")
            await callback.answer()
            return

    await state.clear()
    if isinstance(callback.message, Message):
        await callback.message.edit_text("✅ Vazifa muvaffaqiyatli qo'shildi!")
        await callback.message.answer("Yana nima qilamiz?", reply_markup=MAIN_MENU)
    await callback.answer()


@router.callback_query(TaskCreateStates.confirm, F.data == "confirm:no")
async def process_confirm_no(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    if isinstance(callback.message, Message):
        await callback.message.edit_text("❌ Bekor qilindi.")
        await callback.message.answer("Yana nima qilamiz?", reply_markup=MAIN_MENU)
    await callback.answer()
