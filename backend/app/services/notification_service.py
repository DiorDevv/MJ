import asyncio
import json
import logging
import uuid
from datetime import date, datetime, time, timedelta

import httpx
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import NotificationChannel, NotificationStatus
from app.models.notification_log import NotificationLog
from app.models.push_subscription import PushSubscription
from app.models.task import Task

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


class _StaleSubscriptionError(Exception):
    """Raised when a push endpoint is gone (404/410) and should be deleted."""


def _escape_html(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _format_reminder_text(task: Task) -> str:
    lines = [f"⏰ <b>{_escape_html(task.title)}</b>"]
    if task.description:
        lines.append(_escape_html(task.description))
    lines.append(f"🕐 {task.due_time.strftime('%H:%M')}")
    return "\n".join(lines)


async def _already_sent_today(
    db: AsyncSession, task_id: uuid.UUID, channel: NotificationChannel
) -> bool:
    # sent_at is tz-aware (UTC); combine today's naive local midnight then localize,
    # matching the naive-local/aware-UTC convention used throughout the app.
    start = datetime.combine(date.today(), time.min).astimezone()
    end = start + timedelta(days=1)
    result = await db.execute(
        select(NotificationLog.id)
        .where(
            NotificationLog.task_id == task_id,
            NotificationLog.channel == channel,
            NotificationLog.status == NotificationStatus.SENT,
            NotificationLog.sent_at >= start,
            NotificationLog.sent_at < end,
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def _log_notification(
    db: AsyncSession,
    task_id: uuid.UUID,
    channel: NotificationChannel,
    status: NotificationStatus,
) -> None:
    db.add(NotificationLog(task_id=task_id, channel=channel, status=status))
    await db.commit()


async def _send_telegram(chat_id: int, task: Task) -> None:
    text = _format_reminder_text(task)
    reply_markup = {
        "inline_keyboard": [
            [
                {"text": "✅ Bajarildi", "callback_data": f"complete:{task.id}"},
                {"text": "⏰ Keyinga qoldirish", "callback_data": f"snooze:{task.id}"},
            ]
        ]
    }
    url = f"{TELEGRAM_API_BASE}/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            url,
            json={
                "chat_id": chat_id,
                "text": text,
                "reply_markup": reply_markup,
                "parse_mode": "HTML",
            },
        )
        response.raise_for_status()
        body = response.json()
        if not body.get("ok"):
            raise RuntimeError(f"Telegram API xatosi: {body}")


def _send_web_push_sync(subscription: PushSubscription, task: Task) -> None:
    payload = json.dumps(
        {
            "title": task.title,
            "body": task.description or "Vazifa vaqti keldi",
            "task_id": str(task.id),
        }
    )
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh_key, "auth": subscription.auth_key},
            },
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_claims_email},
        )
    except WebPushException as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        if status_code in (404, 410):
            raise _StaleSubscriptionError from exc
        raise


async def send_task_reminder(db: AsyncSession, task: Task) -> None:
    """Send Telegram/Web Push reminders for a single due task.

    Each channel is attempted and logged independently — one channel failing must
    never prevent another channel from being attempted, and must never propagate
    and abort the caller's loop over other tasks.
    """
    user = task.user

    if user.telegram_chat_id is not None and not await _already_sent_today(
        db, task.id, NotificationChannel.TELEGRAM
    ):
        try:
            await _send_telegram(user.telegram_chat_id, task)
        except Exception:
            logger.exception("Telegram eslatmasini yuborishda xatolik: task_id=%s", task.id)
            await _log_notification(
                db, task.id, NotificationChannel.TELEGRAM, NotificationStatus.FAILED
            )
        else:
            await _log_notification(
                db, task.id, NotificationChannel.TELEGRAM, NotificationStatus.SENT
            )

    if user.push_subscriptions and not await _already_sent_today(
        db, task.id, NotificationChannel.WEB_PUSH
    ):
        any_success = False
        for subscription in list(user.push_subscriptions):
            try:
                await asyncio.to_thread(_send_web_push_sync, subscription, task)
            except _StaleSubscriptionError:
                logger.info("Eskirgan push obuna o'chirildi: subscription_id=%s", subscription.id)
                await db.delete(subscription)
                await db.commit()
            except Exception:
                logger.exception(
                    "Web push yuborishda xatolik: task_id=%s, subscription_id=%s",
                    task.id,
                    subscription.id,
                )
            else:
                any_success = True
        await _log_notification(
            db,
            task.id,
            NotificationChannel.WEB_PUSH,
            NotificationStatus.SENT if any_success else NotificationStatus.FAILED,
        )
