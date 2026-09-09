FROM python:3.11-slim

# --- Proksi (internetsiz VM: build vaqtida apt + pip Squid orqali chiqadi) ----
# .env -> docker-compose build.args -> shu ARG'lar. Bo'sh bo'lsa proksisiz ishlaydi.
# NO_PROXY ga ichki compose hostlarini (postgres, backend, ...) qo'shing —
# aks holda konteynerlararo trafik ham proksiga yuboriladi va buziladi.
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
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Applies pending migrations before every start, so a fresh `docker compose up`
# gets a ready schema without a manual `alembic upgrade head` step.
# --proxy-headers + trust any peer: the backend is never exposed directly, only
# nginx (and, with the Caddy overlay, Caddy→nginx) reaches it — so honouring
# X-Forwarded-Proto/-For is safe and makes request.url.scheme / client IP correct
# behind TLS termination (share links, rate-limit keys).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
