import html

from aiogram import F, Router
from aiogram.types import Message
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from app.services import stats_service, task_service

from telegram_bot.db import get_linked_user
from telegram_bot.keyboards.main_menu import MAIN_MENU

router = Router()

NOT_LINKED_MESSAGE = "Avval /start orqali hisobingizni bog'lang."


def _format_task_line(task: Task) -> str:
    status_icon = "✅" if task.status.value == "completed" else "⏳"
    time_str = task.due_time.strftime("%H:%M")
    return f"{status_icon} {time_str} — {html.escape(task.title)}"


@router.message(F.text == "📋 Bugungi vazifalar")
async def handle_today(message: Message) -> None:
    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, message.chat.id)
        if user is None:
            await message.answer(NOT_LINKED_MESSAGE)
            return
        tasks, _ = await task_service.list_tasks(
            db,
            user.id,
            filter_name="today",
            category_id=None,
            priority=None,
            status=None,
            search=None,
            sort_by="due_date",
            sort_order="asc",
            limit=50,
            offset=0,
        )

    if not tasks:
        await message.answer("Bugun vazifa yo'q, dam oling! 🎉", reply_markup=MAIN_MENU)
        return

    lines = "\n".join(_format_task_line(task) for task in tasks)
    await message.answer(f"📋 <b>Bugungi vazifalar:</b>\n\n{lines}", reply_markup=MAIN_MENU)


@router.message(F.text == "📅 Bu hafta")
async def handle_week(message: Message) -> None:
    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, message.chat.id)
        if user is None:
            await message.answer(NOT_LINKED_MESSAGE)
            return
        tasks, _ = await task_service.list_tasks(
            db,
            user.id,
            filter_name="this_week",
            category_id=None,
            priority=None,
            status=None,
            search=None,
            sort_by="due_date",
            sort_order="asc",
            limit=100,
            offset=0,
        )

    if not tasks:
        await message.answer("Bu hafta uchun vazifalar yo'q.", reply_markup=MAIN_MENU)
        return

    lines = "\n".join(
        f"{task.due_date.strftime('%d.%m')} {_format_task_line(task)}" for task in tasks
    )
    await message.answer(f"📅 <b>Bu haftalik vazifalar:</b>\n\n{lines}", reply_markup=MAIN_MENU)


@router.message(F.text == "📊 Statistika")
async def handle_stats(message: Message) -> None:
    async with AsyncSessionLocal() as db:
        user = await get_linked_user(db, message.chat.id)
        if user is None:
            await message.answer(NOT_LINKED_MESSAGE)
            return
        stats = await stats_service.get_stats(db, user.id, "weekly")

    percent = round(stats.completion_rate * 100)
    text = (
        "📊 <b>Haftalik statistika</b>\n\n"
        f"Bajarilgan: {stats.completed}\n"
        f"Bajarilmagan: {stats.pending}\n"
        f"Jami: {stats.total}\n"
        f"Bajarilish darajasi: {percent}%"
    )
    await message.answer(text, reply_markup=MAIN_MENU)
