# VM'da to'liq ishga tushirish (production, HTTP `:8070`)

Boshdan oxirigacha. VM — Ubuntu/Debian, Squid proksi ortida (to'g'ridan internet yo'q).
Almashtiring: `PROXY_HOST:3128` (Squid), `<VM-IP>` (VM manzili).

MJ 6 konteyner: `postgres` · `backend` (FastAPI) · `frontend` (statik, nginx) ·
`bot` (aiogram) · `speaches` (ovoz→matn) · `nginx` (reverse proxy, yagona tashqi port).

---

## ⚡ Eng oson

**Internet bor VM** (Docker o'rnatilgan):

```bash
git clone https://github.com/DiorDevv/MJ.git && cd MJ
cp .env.prod.example .env
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql+asyncpg://mj_user:$(grep ^POSTGRES_PASSWORD= .env | cut -d= -f2)@postgres:5432/mj_db|" .env
sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$(openssl rand -hex 32)|" .env
docker compose -f docker-compose.yml up -d --build
```

`.env.prod.example` da `NGINX_PORT=8070` — ilova shu portda ochiladi. So'ng
`sudo ufw allow 8070/tcp` (+ cloud SG) → `http://<VM-IP>:8070`.

**Internetsiz VM (Squid)** — bitta skript hammasini qiladi (Docker/proksi
tekshiruvi, `.env` ni tasodifiy sirlar + VAPID bilan yaratish, stack'ni ko'tarish):

```bash
./deploy/vm-setup.sh --proxy http://PROXY_HOST:3128
#  standart port 8070; o'zgartirish: --port 80
#  ixtiyoriy: --bot-token 123:ABC --no-build
```

Yangilash: `./deploy/vm-update.sh`. Air-gap (proksi ham yo'q): "B yo'li" (pastda).

> `.env` allaqachon bo'lsa skript sirlarga tegmaydi — faqat proksi/port qatorini yangilaydi.

Qo'lda qadamlar — quyida.

---

## Hammasi Docker orqalimi?

**Ha.** Baza, backend, frontend/nginx, bot, ovoz→matn — barchasi `docker compose`.
Host'da faqat:

| Host ishi | Majburiymi? | Chetlab o'tish |
|-----------|-------------|----------------|
| Docker + compose plugin | Ha (yagona prerekvizit) | — |
| Docker demoni proksisi (`http-proxy.conf`) | Internetsiz VM'da base image tortish uchun | **Air-gap bundle** (B yo'li) — proksi shart emas |
| `openssl` (sirlar) | Yo'q | konteynerda: `docker run --rm python:3.11-slim python -c "import secrets;print(secrets.token_hex(32))"` |
| Firewall / cloud security group | Portni ochish uchun | — (provayder ishi) |

---

## 0. VM ga ulanish

```bash
ssh foydalanuvchi@<VM-IP>
```

## 1. Proksi — host (apt / git / openssl uchun)

```bash
sudo tee /etc/apt/apt.conf.d/95proxy >/dev/null <<'EOF'
Acquire::http::Proxy  "http://PROXY_HOST:3128";
Acquire::https::Proxy "http://PROXY_HOST:3128";
EOF
echo 'export http_proxy=http://PROXY_HOST:3128
export https_proxy=http://PROXY_HOST:3128
export no_proxy=localhost,127.0.0.1,::1' | sudo tee /etc/profile.d/proxy.sh
source /etc/profile.d/proxy.sh
```

## 2. Docker + Compose (o'rnatilmagan bo'lsa)

```bash
docker --version && docker compose version   # bo'lsa — bu bo'limni o'tkazing

sudo apt-get update
sudo apt-get install -y docker.io docker-buildx docker-compose-v2 git openssl
sudo systemctl enable --now docker
sudo usermod -aG docker $USER      # keyin tizimdan chiqib qayta kiring (yoki: newgrp docker)
```

## 3. Proksi — Docker demoni uchun

`docker pull` base image'larni (`postgres:16-alpine`, `python:3.11-slim`,
`node:22-alpine`, `nginx:1.27-alpine`, `ghcr.io/speaches-ai/speaches:latest-cpu`)
tortadi — demon `.env` ni o'qimaydi:

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf >/dev/null <<'EOF'
[Service]
Environment="HTTP_PROXY=http://PROXY_HOST:3128"
Environment="HTTPS_PROXY=http://PROXY_HOST:3128"
Environment="NO_PROXY=localhost,127.0.0.1,::1"
EOF
sudo systemctl daemon-reload && sudo systemctl restart docker
docker pull hello-world     # ishlashi kerak
```

> Proksi umuman bo'lmasa (air-gap): bu qadamni tashlab, "B yo'li"ga o'ting.

## 4. Kodni olish

```bash
cd ~
git clone https://github.com/DiorDevv/MJ.git
cd MJ
```

## 5. `.env` — konfiguratsiya

MJ bitta `.env` o'qiydi. Namunani nusxalang:

```bash
cp .env.prod.example .env
chmod 600 .env
nano .env
```

**Majburiy almashtiriladigan qatorlar:**

| Qator | Qiymat |
|-------|--------|
| `POSTGRES_PASSWORD` | kuchli parol: `openssl rand -hex 24` |
| `DATABASE_URL` | ichidagi parolni yuqoridagi bilan BIR XIL qiling |
| `SECRET_KEY` | `openssl rand -hex 32` |
| `HTTP_PROXY` / `HTTPS_PROXY` | `http://PROXY_HOST:3128` |
| `NO_PROXY` | `localhost,127.0.0.1,::1,postgres,backend,frontend,bot,speaches,nginx` (o'zgartirmang) |
| `CORS_ORIGINS` | `http://<VM-IP>:8070` (yoki domen) — port `NGINX_PORT` bilan bir xil |
| `NGINX_PORT` | `8070` (standart; band bo'lsa boshqasi + `CORS_ORIGINS` ni moslang) |
| `TELEGRAM_BOT_TOKEN` | @BotFather tokeni (bo'sh bo'lsa bot qulaydi, qolgani ishlaydi) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` (bo'sh bo'lsa Web Push o'chiq) |

Sirlarni tez qo'yish:

```bash
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
PGP=$(grep ^POSTGRES_PASSWORD= .env | cut -d= -f2)
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql+asyncpg://mj_user:${PGP}@postgres:5432/mj_db|" .env
sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$(openssl rand -hex 32)|" .env

# VAPID (openssl yo'q joyda ham):
docker run --rm node:22-alpine npx --yes web-push generate-vapid-keys
# chiqqan Public/Private Key ni .env dagi VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ga qo'ying
```

## 6. Qurish va ishga tushirish

```bash
docker compose -f docker-compose.yml up -d --build
```

> **`-f docker-compose.yml` SHART** — bu `docker-compose.override.yml` ni
> o'chiradi. Aks holda `postgres`/`backend`/`frontend` host portlariga ochilib
> qoladi va `frontend` dev-server rejimida ishlaydi.

Birinchi safar 4–8 daqiqa (proksi orqali `apt`/`pip`/`npm` + speaches modeli).
Backend startida avtomatik: PostgreSQL kutadi → `alembic upgrade head` → uvicorn.

## 7. Tekshirish

```bash
docker compose -f docker-compose.yml ps        # 6 xizmat "Up" (postgres "healthy")
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8070/    # 200
docker compose -f docker-compose.yml exec -T backend \
  python -c "import urllib.request;print(urllib.request.urlopen('http://localhost:8000/health').read())"
```

Loglar: `docker compose -f docker-compose.yml logs -f`

## 8. Portni tashqariga ochish

```bash
sudo ufw allow 8070/tcp        # NGINX_PORT bilan bir xil
```

Bulutli VM bo'lsa — **security group / firewall** da ham 8070/TCP kirish ruxsatini
qo'shing. So'ng brauzerdan: **`http://<VM-IP>:8070`**

## 9. Birinchi kirish

Ilova ochiladi → **Ro'yxatdan o'tish** (birinchi foydalanuvchi) → login. Super admin
tushunchasi yo'q — har kim o'zi ro'yxatdan o'tadi.

## 10. Reboot'dan keyin

Hech narsa qilmaysiz — `restart: unless-stopped` + `systemctl enable docker`
tufayli VM qayta yuklanganda o'zi ko'tariladi.

## 11. Yangilash

```bash
cd ~/MJ && ./deploy/vm-update.sh
#  = git pull --ff-only && docker compose -f docker-compose.yml up -d --build
```

Migratsiyalar backend startida avtomatik. Ma'lumotlar `postgres_data`,
ovozli xabarlar `./shared` volume'ida qoladi.

## 12. Zaxira (backup)

```bash
./scripts/backup-db.sh                                  # backups/mj_db_<sana>.sql.gz
./scripts/restore-db.sh backups/mj_db_YYYYMMDD_HHMMSS.sql.gz   # ALMASHTIRADI
./scripts/install-backup-cron.sh                        # kunlik 03:00 cron
```

## 13. (Ixtiyoriy) Domen + HTTPS

MJ'da tayyor HTTPS overlay bor — `docker-compose.prod.yml` (nginx'ga 443 + TLS
qo'shadi). Sertifikatni oldindan `nginx/certs/fullchain.pem` va
`nginx/certs/privkey.pem` ga qo'ying (certbot — `nginx/certs/README.md`).

```bash
# .env: VITE_API_URL=/api  (nisbiy — o'zgartirish shart emas)
#       CORS_ORIGINS=https://sizning-domen.com
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`80` ochiq qolsin (ACME + HTTP→HTTPS redirect), `443` ni ham oching.
Keyingi har `up`/`logs`/`down` da ikkala `-f` faylni bering.

> HTTPS overlay standart `80`/`443` portlarida ishlaydi — bu holatda `NGINX_PORT`
> (8070) ishlatilmaydi, shu sabab 8070 ni tashqaridan yopsangiz bo'ladi.

---

## B yo'li — air-gap bundle (proksi umuman yo'q)

**Internetli mashinada** (repo klon qilingan):

```bash
./deploy/bundle.sh              # -> mj-bundle.tgz  (~1–1.5 GB, speaches image katta)
```

**Arxivni VM'ga** (`scp mj-bundle.tgz user@<VM-IP>:~/`), so'ng VM'da:

```bash
gunzip -c ~/mj-bundle.tgz | docker load

git clone https://github.com/DiorDevv/MJ.git && cd MJ   # yoki repo'ni fayl orqali
cp .env.prod.example .env && nano .env      # 5-bo'limdek; HTTP_PROXY/HTTPS_PROXY — BO'SH
docker compose -f docker-compose.yml up -d --no-build
```

`--no-build` — hech narsa tortilmaydi/qurilmaydi. Keyin 7–9 bo'limlar bir xil.

> Air-gap'da `bot` (Telegram) va `speaches` (model yuklab bo'lmaydi) ishlamaydi —
> sayt + vazifalar to'liq ishlaydi. Keyinroq proksi paydo bo'lsa: `.env` ga
> `HTTP_PROXY`/`HTTPS_PROXY` yozib `docker compose -f docker-compose.yml up -d`.

---

## Muammolar

| Belgi | Sabab / yechim |
|-------|----------------|
| `docker pull` osilib qoladi | Docker demoni proksisi (3-bo'lim) qilinmagan — yoki B yo'li |
| build'da `apt`/`pip`/`npm` timeout | `.env` da `HTTP_PROXY/HTTPS_PROXY` bo'sh yoki noto'g'ri |
| backend `postgres`ga ulanmaydi | `NO_PROXY` da `postgres` yo'q — 5-bo'limdagi qiymatni to'liq qo'ying |
| backend log'da `password authentication failed for user "mj_user"` | DB volume boshqa parol bilan yaratilgan. **`./deploy/vm-fix-db-auth.sh`** (ma'lumot saqlanadi) |
| `postgres`/`backend` host portida ochiq qolgan | `-f docker-compose.yml` berilmagan (override.yml qo'shilib ketgan) — qayta: `up -d` bilan aynan shu `-f` |
| bot log'da `Cannot connect to host api.telegram.org` | proksi runtime'ga yetmagan: `.env` da `HTTP_PROXY` bor-yo'qligini, konteyner qayta yaratilganini (`up -d`, `restart` emas) tekshiring |
| Web Push ishlamaydi | `.env` da `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` bo'sh — generatsiya qilib `up -d --build` |
| ovozli xabar "matn bilan yozing" deydi | `speaches` modelni yuklay olmagan (proksi yo'q) yoki hali yuklyapti (birinchi safar bir necha daqiqa) |
| sayt ochiladi-yu API 502 | backend hali `alembic`/start bosqichida — `logs -f backend` bilan kuting |
