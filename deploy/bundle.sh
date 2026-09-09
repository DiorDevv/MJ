#!/usr/bin/env bash
# ============================================================
#  Air-gap bundle — INTERNETLI mashinada barcha image'larni bitta arxivga yig'adi.
#  Proksi ham, internet ham yo'q VM uchun.
#
#  Internetli mashinada:
#     ./deploy/bundle.sh                      # -> mj-bundle.tgz
#
#  VM'da (internet/proksi shart emas):
#     gunzip -c mj-bundle.tgz | docker load
#     cp .env.prod.example .env && nano .env  # sirlarni to'ldiring, HTTP_PROXY BO'SH
#     docker compose -f docker-compose.yml up -d --no-build
#
#  Eslatma: `--no-build` uchun compose fayldagi `image:` nomlari (mj-backend,
#  mj-frontend, mj-bot) `docker load` qilingan nomlarga mos bo'lishi kerak —
#  docker-compose.yml da shunday belgilangan.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-mj-bundle.tgz}"

# compose faqat o'zgaruvchi interpolatsiyasi uchun ba'zi qiymatlarni so'raydi —
# build natijasiga ta'sir qilmaydi.
export POSTGRES_USER="${POSTGRES_USER:-mj_user}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-bundle-build-only}"
export POSTGRES_DB="${POSTGRES_DB:-mj_db}"
export DATABASE_URL="${DATABASE_URL:-postgresql+asyncpg://mj_user:bundle-build-only@postgres:5432/mj_db}"
export VITE_API_URL="${VITE_API_URL:-/api}"

CF="-f docker-compose.yml"

echo "==> Image'lar qurilmoqda (backend + frontend + bot)..."
# shellcheck disable=SC2086
docker compose $CF build

echo "==> Base image'lar tortilmoqda..."
docker pull postgres:16-alpine
docker pull nginx:1.27-alpine
docker pull ghcr.io/speaches-ai/speaches:latest-cpu

echo "==> Arxivlash: $OUT"
docker save \
  mj-backend mj-frontend mj-bot \
  postgres:16-alpine nginx:1.27-alpine ghcr.io/speaches-ai/speaches:latest-cpu \
  | gzip > "$OUT"

echo "==> Tayyor: $OUT ($(du -h "$OUT" | cut -f1))"
echo "    VM'ga ko'chiring (scp), so'ng:"
echo "      gunzip -c $OUT | docker load"
echo "      cp .env.prod.example .env && nano .env"
echo "      docker compose -f docker-compose.yml up -d --no-build"
