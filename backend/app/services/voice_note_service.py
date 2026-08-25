import uuid
from pathlib import Path

# Shared bind mount between the bot (which writes here after transcribing a voice
# quick-add) and the backend (which serves the file back for playback) — see the
# `shared` volume in docker-compose.yml. Same absolute path in both containers
# since both Dockerfiles set WORKDIR /app.
VOICE_NOTES_DIR = Path("/app/shared/voice_notes")


def save_voice_note(data: bytes) -> str:
    """Writes a voice note under a fresh random filename and returns it (not a
    full path — callers only ever need the filename, resolved via voice_note_file_path)."""
    VOICE_NOTES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}.ogg"
    (VOICE_NOTES_DIR / filename).write_bytes(data)
    return filename


def voice_note_file_path(filename: str) -> Path:
    return VOICE_NOTES_DIR / filename
