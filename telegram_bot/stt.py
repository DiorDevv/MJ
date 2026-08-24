import logging
from typing import BinaryIO

import httpx
from aiogram import Bot
from aiogram.types import Voice
from app.core.config import settings

logger = logging.getLogger(__name__)

# Telegram voice messages are already short by convention (push-to-talk UI), but a
# cap keeps a single request's latency (and, on the hosted-API path, cost) bounded.
MAX_VOICE_SECONDS = 120

# CPU-bound self-hosted transcription (see the speaches service in docker-compose.yml)
# is meaningfully slower than the hosted OpenAI API's typical sub-second turnaround —
# a few seconds per note is normal there, not a hang.
_REQUEST_TIMEOUT_SECONDS = 60.0


class TranscriptionUnavailableError(Exception):
    """Raised whenever a voice message can't be turned into text — the file couldn't
    be downloaded, or the configured STT backend failed/returned nothing."""


async def transcribe_voice(bot: Bot, voice: Voice) -> str:
    file_bytes: BinaryIO | None = await bot.download(voice)
    if file_bytes is None:
        raise TranscriptionUnavailableError("Ovozli xabar fayli yuklab olinmadi")

    # Self-hosted OpenAI-compatible servers (speaches et al.) don't require a key by
    # default — omit the header entirely rather than send "Bearer " with nothing after it.
    headers = {"Authorization": f"Bearer {settings.stt_api_key}"} if settings.stt_api_key else {}

    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
        try:
            response = await client.post(
                settings.stt_base_url,
                headers=headers,
                data={"model": settings.stt_model, "language": "uz"},
                files={"file": ("voice.ogg", file_bytes, "audio/ogg")},
            )
        except httpx.HTTPError as exc:
            raise TranscriptionUnavailableError("STT xizmati bilan bog'lanib bo'lmadi") from exc

    if response.status_code != 200:
        logger.error(
            "STT transkripsiya xatosi: status=%s body=%s", response.status_code, response.text
        )
        raise TranscriptionUnavailableError(f"STT xizmati xatosi: {response.status_code}")

    text = str(response.json().get("text", "")).strip()
    if not text:
        raise TranscriptionUnavailableError("Ovozli xabarda matn aniqlanmadi")
    return text
