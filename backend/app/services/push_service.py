import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.push_subscription import PushSubscription
from app.schemas.push import PushSubscribeRequest


async def upsert_subscription(
    db: AsyncSession, user_id: uuid.UUID, payload: PushSubscribeRequest
) -> PushSubscription:
    # endpoint is globally unique per browser/device registration — if it already
    # exists (e.g. re-subscribing, or a different account on a shared browser),
    # reassign it rather than violating the unique constraint.
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        existing.user_id = user_id
        existing.p256dh_key = payload.keys.p256dh
        existing.auth_key = payload.keys.auth
        await db.commit()
        await db.refresh(existing)
        return existing

    subscription = PushSubscription(
        user_id=user_id,
        endpoint=payload.endpoint,
        p256dh_key=payload.keys.p256dh,
        auth_key=payload.keys.auth,
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    return subscription


async def remove_subscription(db: AsyncSession, user_id: uuid.UUID, endpoint: str) -> None:
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.endpoint == endpoint, PushSubscription.user_id == user_id
        )
    )
    subscription = result.scalar_one_or_none()
    if subscription is not None:
        await db.delete(subscription)
        await db.commit()
