#!/usr/bin/env bash
# MJ — yangi versiyaga o'tish (git pull + qayta build). Ma'lumotlar saqlanadi.
# Migratsiyalar backend konteyneri startida avtomatik qo'llanadi.
set -euo pipefail
cd "$(dirname "$0")/.."

DC="docker compose"; docker compose version >/dev/null 2>&1 || DC="docker-compose"
CF="-f docker-compose.yml"   # override.yml QO'SHILMAYDI (prod-xavfsiz)

git pull --ff-only
# shellcheck disable=SC2086
$DC $CF up -d --build
echo "==> Yangilandi. Holat:"
# shellcheck disable=SC2086
$DC $CF ps
