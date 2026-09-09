#!/usr/bin/env bash
# ============================================================
#  MJ — VM'da bir buyruqli o'rnatuvchi (HTTP, standart port :8070)
#
#  Foydalanish (repo ildizidan yoki deploy/ ichidan):
#    ./deploy/vm-setup.sh                                 # proksi Docker demonidan avtomatik olinadi
#    ./deploy/vm-setup.sh --proxy http://10.0.0.5:3128    # proksini qo'lda berish
#    ./deploy/vm-setup.sh --port 80                       # tashqi HTTP portni o'zgartirish (standart 8070)
#    ./deploy/vm-setup.sh --bot-token 123:ABC             # Telegram bot tokeni
#    ./deploy/vm-setup.sh --no-build                      # air-gap: oldindan `docker load` qilingan
#
#  Nima qiladi:
#    1. Docker + compose borligini tekshiradi
#    2. Proksi: --proxy berilmasa /etc/systemd/system/docker.service.d/http-proxy.conf
#       dan avtomatik oladi; ./.env ga yozadi (build + runtime shu orqali chiqadi)
#    3. .env ni yaratadi (yo'q bo'lsa) — .env.prod.example asosida, tasodifiy
#       SECRET_KEY / POSTGRES_PASSWORD va (imkoni bo'lsa) VAPID kalitlari bilan
#    4. docker compose -f docker-compose.yml up -d --build   (override.yml QO'SHILMAYDI)
#    5. nginx (:PORT) va backend /health tayyor bo'lishini kutadi, URL chop etadi
#
#  .env ALLAQACHON bo'lsa — mos qatorlar (proksi/port) yangilanadi, sirlar saqlanadi.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

PROXY=""
PORT="8070"
PORT_SET=0
BOT_TOKEN=""
BUILD_FLAG="--build"

while [ $# -gt 0 ]; do
  case "$1" in
    --proxy)     PROXY="$2"; shift 2 ;;
    --port)      PORT="$2"; PORT_SET=1; shift 2 ;;
    --bot-token) BOT_TOKEN="$2"; shift 2 ;;
    --no-build)  BUILD_FLAG=""; shift ;;
    -h|--help)   sed -n '2,21p' "$0"; exit 0 ;;
    *) echo "Noma'lum parametr: $1" >&2; exit 2 ;;
  esac
done

say() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mXATO:\033[0m %s\n' "$*" >&2; exit 1; }

CF="-f docker-compose.yml"   # override.yml ni ATAYIN o'chiramiz (prod-xavfsiz)

# --- 1. Docker ---------------------------------------------------------------
command -v docker >/dev/null 2>&1 || die "Docker o'rnatilmagan. O'rnating:
  sudo apt-get update && sudo apt-get install -y docker.io docker-buildx docker-compose-v2 git openssl
  sudo systemctl enable --now docker && sudo usermod -aG docker \$USER   # keyin qayta login"

if docker compose version >/dev/null 2>&1; then DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"
else die "'docker compose' topilmadi: sudo apt-get install -y docker-compose-v2"; fi
docker info >/dev/null 2>&1 || die "Docker demoniga ulanib bo'lmadi (sudo kerakmi? yoki 'newgrp docker')."

gen_hex() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex "$1"
  else docker run --rm python:3.11-slim python -c "import secrets;print(secrets.token_hex($1))"
  fi
}

# --- 2. Proksi -------------------------------------------------------------
# --proxy berilmasa Docker demoni konfiguratsiyasidan avtomatik topamiz.
PROXY_AUTO=0
DAEMON_PROXY_FILE=/etc/systemd/system/docker.service.d/http-proxy.conf
if [ -z "$PROXY" ] && [ -r "$DAEMON_PROXY_FILE" ]; then
  PROXY="$(sed -n 's/.*"HTTP_PROXY=\([^"]*\)".*/\1/p' "$DAEMON_PROXY_FILE" | head -1)"
  [ -n "$PROXY" ] && { PROXY_AUTO=1; say "Proksi Docker demoni konfiguratsiyasidan olindi: $PROXY"; }
fi

if [ -n "$PROXY" ] && [ "$PROXY_AUTO" = 0 ]; then
  say "Docker demoni proksisi sozlanmoqda ($PROXY) — base image'larni tortish uchun"
  sudo mkdir -p /etc/systemd/system/docker.service.d
  printf '[Service]\nEnvironment="HTTP_PROXY=%s"\nEnvironment="HTTPS_PROXY=%s"\nEnvironment="NO_PROXY=localhost,127.0.0.1,::1"\n' \
    "$PROXY" "$PROXY" | sudo tee "$DAEMON_PROXY_FILE" >/dev/null
  sudo systemctl daemon-reload && sudo systemctl restart docker && sleep 2
fi

# --- 3. .env --------------------------------------------------------------
NO_PROXY_VAL="localhost,127.0.0.1,::1,postgres,backend,frontend,bot,speaches,nginx"

set_kv() {  # set_kv KEY VALUE  — ./.env da KEY qatorini yangilaydi yoki qo'shadi
  local f="$ROOT/.env"
  touch "$f"
  if grep -q "^$1=" "$f" 2>/dev/null; then
    sed -i "s|^$1=.*|$1=$2|" "$f"
  else
    printf '%s=%s\n' "$1" "$2" >> "$f"
  fi
}

GENERATED=0
if [ -f "$ROOT/.env" ]; then
  say ".env allaqachon mavjud — sirlar saqlanadi, faqat proksi yangilanadi"
else
  say ".env yaratilmoqda (.env.prod.example asosida, tasodifiy sirlar bilan)"
  cp "$ROOT/.env.prod.example" "$ROOT/.env"
  chmod 600 "$ROOT/.env"
  GENERATED=1

  PGPASS="$(gen_hex 24)"
  SECRET="$(gen_hex 32)"
  set_kv POSTGRES_PASSWORD "$PGPASS"
  set_kv DATABASE_URL      "postgresql+asyncpg://mj_user:${PGPASS}@postgres:5432/mj_db"
  set_kv SECRET_KEY        "$SECRET"

  # VAPID (Web Push) — imkoni bo'lsa generatsiya qilamiz, bo'lmasa bo'sh (push
  # ishlamaydi, qolgani ishlaydi).
  VAPID_JSON=""
  if command -v npx >/dev/null 2>&1; then
    VAPID_JSON="$(npx --yes web-push generate-vapid-keys --json 2>/dev/null || true)"
  fi
  if [ -z "$VAPID_JSON" ]; then
    VAPID_JSON="$(docker run --rm node:22-alpine npx --yes web-push generate-vapid-keys --json 2>/dev/null || true)"
  fi
  if [ -n "$VAPID_JSON" ]; then
    VPUB="$(printf '%s' "$VAPID_JSON" | sed -n 's/.*"publicKey":"\([^"]*\)".*/\1/p')"
    VPRIV="$(printf '%s' "$VAPID_JSON" | sed -n 's/.*"privateKey":"\([^"]*\)".*/\1/p')"
    [ -n "$VPUB" ]  && set_kv VAPID_PUBLIC_KEY  "$VPUB"
    [ -n "$VPRIV" ] && set_kv VAPID_PRIVATE_KEY "$VPRIV"
    say "VAPID kalitlari generatsiya qilindi"
  else
    say "OGOHLANTIRISH: VAPID kalitlarini generatsiya qilib bo'lmadi — Web Push o'chiq bo'ladi."
    say "  Keyinroq: npx web-push generate-vapid-keys  -> .env dagi VAPID_* ni to'ldiring -> up -d --build"
  fi
fi

# Proksi — har doim moslanadi (berilgan bo'lsa). Qolgan qatorlar (port, CORS,
# bot-token) faqat yangi .env da yoki aniq bayroq berilganda yoziladi, aks
# holda skript qayta ishga tushirilganda foydalanuvchi sozlamasini bosib ketmaydi.
if [ -n "$PROXY" ]; then
  set_kv HTTP_PROXY  "$PROXY"
  set_kv HTTPS_PROXY "$PROXY"
fi
if [ "$GENERATED" = 1 ]; then set_kv NO_PROXY "$NO_PROXY_VAL"; fi

if [ "$GENERATED" = 1 ] || [ "$PORT_SET" = 1 ]; then
  set_kv NGINX_PORT "$PORT"
fi

# Amaldagi portni .env dan aniqlaymiz (foydalanuvchi qo'lda o'zgartirgan bo'lishi mumkin)
PORT="$(grep -E '^NGINX_PORT=' "$ROOT/.env" | head -1 | cut -d= -f2)"; PORT="${PORT:-8070}"

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"; IP="${IP:-localhost}"
ORIGIN="http://${IP}"; [ "$PORT" = "80" ] || ORIGIN="http://${IP}:${PORT}"
if [ "$GENERATED" = 1 ]; then set_kv CORS_ORIGINS "$ORIGIN"; fi
[ -n "$BOT_TOKEN" ] && set_kv TELEGRAM_BOT_TOKEN "$BOT_TOKEN"

# --- 4. Ishga tushirish ------------------------------------------------
say "Konteynerlar qurilmoqda va ko'tarilmoqda (birinchi safar bir necha daqiqa)"
# shellcheck disable=SC2086
$DC $CF up -d $BUILD_FLAG

# --- 5. Health kutish ------------------------------------------------
say "nginx (:$PORT) kutilmoqda..."
OK=0
for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null "http://localhost:${PORT}/" 2>/dev/null; then OK=1; break; fi
  sleep 2
done
[ "$OK" = 1 ] || die "nginx 3 daqiqada javob bermadi. Loglar: $DC $CF logs -f nginx frontend"

say "backend /health kutilmoqda..."
OK=0
for _ in $(seq 1 90); do
  if $DC $CF exec -T backend python -c \
      "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health',timeout=3).status==200 else 1)" \
      >/dev/null 2>&1; then OK=1; break; fi
  sleep 2
done
[ "$OK" = 1 ] || die "backend 3 daqiqada tayyor bo'lmadi. Loglar: $DC $CF logs -f backend
  (agar log'da 'password authentication failed' bo'lsa:  ./deploy/vm-fix-db-auth.sh)"

printf '\n\033[1;32m✓ Tayyor.\033[0m\n\n'
printf '  URL:      %s\n' "$ORIGIN"
printf '  Sirlar:   .env  (SECRET_KEY / POSTGRES_PASSWORD tasodifiy generatsiya qilingan)\n'
if ! grep -qE '^TELEGRAM_BOT_TOKEN=.+' "$ROOT/.env"; then
  printf '  Bot:      TELEGRAM_BOT_TOKEN bosh -- bot qayta-qayta qulaydi (normal holat).\n'
  printf '            Token qo`shsangiz: .env ni tahrirlang, keyin  %s %s up -d\n' "$DC" "$CF"
fi
printf '\n  Portni oching:  sudo ufw allow %s/tcp   (+ cloud security group)\n' "$PORT"
printf '  Loglar:         %s %s logs -f\n' "$DC" "$CF"
printf '  Yangilash:      ./deploy/vm-update.sh\n\n'
