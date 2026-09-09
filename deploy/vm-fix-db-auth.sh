#!/usr/bin/env bash
# ============================================================
#  MJ — DB "password authentication failed for user" ni BITTA buyruqda tuzatish.
#
#  Qachon: backend/bot ko'tarilmayapti, log'da:
#     "password authentication failed for user \"mj_user\""
#  Sabab: Postgres `postgres_data` volume'i BOSHQA parol bilan yaratilgan.
#  Postgres parolni FAQAT bo'sh volume'da, birinchi startda o'rnatadi. Keyin
#  .env dagi POSTGRES_PASSWORD ni o'zgartirsangiz, DB'dagi haqiqiy parol
#  o'zgarmaydi — backend esa yangi parol bilan urinadi.
#
#  Nima qiladi (MA'LUMOT SAQLANADI, volume o'chirilmaydi):
#    1. .env dagi POSTGRES_USER/PASSWORD ni oladi (yo'q bo'lsa: mj_user)
#    2. Faqat `postgres` ni ko'taradi va tayyor bo'lishini kutadi
#    3. DB ichidagi foydalanuvchi parolini .env dagi qiymatga tenglaydi (ALTER ROLE)
#    4. Butun stack'ni qayta ko'taradi: up -d --build
#    5. Holat + backend loglarini ko'rsatadi
#
#  Foydalanish:  ./deploy/vm-fix-db-auth.sh
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

DC="docker compose"; docker compose version >/dev/null 2>&1 || DC="docker-compose"
CF="-f docker-compose.yml"

envval() {  # envval KEY DEFAULT  — ./.env dan qiymat oladi (o'rovchi tirnoqlarsiz)
  local v=""
  [ -f .env ] && v="$(grep -E "^$1=" .env | head -1 | cut -d= -f2- | tr -d '\042\047')"
  printf '%s' "${v:-$2}"
}

DB_USER="$(envval POSTGRES_USER mj_user)"
DB_PASS="$(envval POSTGRES_PASSWORD change_me)"
DB_NAME="$(envval POSTGRES_DB mj_db)"

echo "==> Mo'ljallangan: user='$DB_USER'  db='$DB_NAME'"

echo "==> Faqat 'postgres' ko'tarilmoqda..."
# shellcheck disable=SC2086
$DC $CF up -d postgres

echo "==> 'postgres' tayyor bo'lishini kutamiz..."
for _ in $(seq 1 45); do
  # shellcheck disable=SC2086
  $DC $CF exec -T postgres pg_isready -U "$DB_USER" >/dev/null 2>&1 && break
  sleep 2
done

echo "==> '$DB_USER' parolini .env dagi qiymatga tenglaymiz (ALTER ROLE)..."
SQL="ALTER ROLE \"$DB_USER\" WITH PASSWORD '$DB_PASS';"
# shellcheck disable=SC2086
if ! $DC $CF exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -c "$SQL" 2>/dev/null; then
  echo "   '$DB_USER' bilan bo'lmadi — 'postgres' superuser bilan urinamiz..."
  # shellcheck disable=SC2086
  $DC $CF exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c "$SQL"
fi
echo "   OK."

echo "==> Butun stack qayta ko'tariladi..."
# shellcheck disable=SC2086
$DC $CF up -d --build

echo
echo "==> Holat:"
# shellcheck disable=SC2086
$DC $CF ps
echo
echo "==> Backend loglari (oxirgi 25 qator):"
# shellcheck disable=SC2086
$DC $CF logs --tail=25 backend || true
echo
echo "Tayyor. backend/bot endi ko'tarilishi kerak."
