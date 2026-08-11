import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from app.core.config import settings

from telegram_bot.handlers import menu, quick_add, reminder_actions, start, task_create

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main() -> None:
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")

    bot = Bot(
        token=settings.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dispatcher = Dispatcher(storage=MemoryStorage())

    # Order matters: FSM-scoped handlers (task_create) must run before the
    # plain-text menu router, otherwise a reply-keyboard label typed while
    # mid-flow would be swallowed by the wrong handler. quick_add is a
    # catch-all for free text outside any state, so it must run last.
    dispatcher.include_router(start.router)
    dispatcher.include_router(task_create.router)
    dispatcher.include_router(menu.router)
    dispatcher.include_router(reminder_actions.router)
    dispatcher.include_router(quick_add.router)

    await bot.delete_webhook(drop_pending_updates=True)
    logger.info("MJ Telegram bot started")
    await dispatcher.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
