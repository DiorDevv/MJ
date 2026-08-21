import logging
from typing import BinaryIO

import httpx
from aiogram import Bot
from aiogram.types import Voice
from app.core.config import settings

logger = logging.getLogger(__name__)

_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions"

# Telegram voice messages are already short by convention (push-to-talk UI), but a
# cap keeps a single message's OpenAI cost and request latency bounded.
MAX_VOICE_SECONDS = 120


class TranscriptionUnavailableError(Exception):
    """Raised whenever a voice message can't be turned into text — config missing,
    the file couldn't be downloaded, or the OpenAI API failed/returned nothing."""


async def transcribe_voice(bot: Bot, voice: Voice) -> str:
    if not settings.openai_api_key:
        raise TranscriptionUnavailableError("OPENAI_API_KEY sozlanmagan")

    file_bytes: BinaryIO | None = await bot.download(voice)
    if file_bytes is None:
        raise TranscriptionUnavailableError("Ovozli xabar fayli yuklab olinmadi")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                _TRANSCRIPTION_URL,
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                data={"model": "whisper-1", "language": "uz"},
                files={"file": ("voice.ogg", file_bytes, "audio/ogg")},
            )
        except httpx.HTTPError as exc:
            raise TranscriptionUnavailableError("OpenAI API bilan bog'lanib bo'lmadi") from exc

    if response.status_code != 200:
        logger.error(
            "OpenAI transkripsiya xatosi: status=%s body=%s", response.status_code, response.text
        )
        raise TranscriptionUnavailableError(f"OpenAI API xatosi: {response.status_code}")

    text = str(response.json().get("text", "")).strip()
    if not text:
        raise TranscriptionUnavailableError("Ovozli xabarda matn aniqlanmadi")
    return text
