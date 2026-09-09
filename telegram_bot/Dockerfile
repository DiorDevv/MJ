FROM python:3.11-slim

# --- Proksi (internetsiz VM: build vaqtida apt + pip Squid orqali chiqadi) ----
# .env -> docker-compose build.args -> shu ARG'lar. Bo'sh bo'lsa proksisiz ishlaydi.
# Diqqat: bot RUNTIME'da ham api.telegram.org ga chiqadi — u proksi
# docker-compose.yml'dagi `bot` xizmatining `environment:` bo'limidan beriladi.
ARG HTTP_PROXY=
ARG HTTPS_PROXY=
ARG NO_PROXY=
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    http_proxy=${HTTP_PROXY} \
    https_proxy=${HTTPS_PROXY} \
    no_proxy=${NO_PROXY}

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY telegram_bot/requirements.txt ./telegram_bot-requirements.txt
RUN pip install --no-cache-dir -r telegram_bot-requirements.txt

# Reuse the backend's SQLAlchemy models, db session, config and business-logic
# services verbatim (same import path: app.*) instead of redefining them —
# the single source of truth for "what a task/user/category is" stays in one
# place. This is a plain file copy, not a build-time dependency on the
# backend image, so the bot builds and starts independently of it.
COPY backend/app /app/app
COPY telegram_bot /app/telegram_bot

CMD ["python", "-m", "telegram_bot.bot"]
