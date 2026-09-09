# MJ

Shaxsiy vazifa va eslatma boshqaruv tizimi — FastAPI + PostgreSQL backend, React + TypeScript
frontend, aiogram Telegram bot. Vazifani saytda ham, botda ham qo'shish/ko'rish/tahrirlash mumkin —
barchasi bitta umumiy PostgreSQL bazasi bilan ishlaydi.

## Ishga tushirish

1. `.env.example` faylini `.env` nomiga nusxalang va qiymatlarni to'ldiring:

   ```bash
   cp .env.example .env
   ```

   Kamida quyidagilarni o'zgartiring:
   - `POSTGRES_PASSWORD`, `SECRET_KEY` — ixtiyoriy tasodifiy qiymatlarga
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — Web Push uchun (`npx web-push generate-vapid-keys`)
   - `TELEGRAM_BOT_TOKEN` — [@BotFather](https://t.me/BotFather) orqali olingan token
     (token yo'q bo'lsa ham qolgan tizim ishlayveradi — faqat `bot` xizmati qayta-qayta
     qulab tushib qayta ishga tushaveradi, bu normal holat)
   - `STT_BASE_URL` / `STT_API_KEY` / `STT_MODEL` — ixtiyoriy: botga ovozli xabar
     yuborib vazifa qo'shish uchun. Standart holatda `docker-compose.yml`dagi
     `speaches` xizmatiga (o'z serverida ishlaydigan, bepul faster-whisper) ishora
     qiladi — hech narsa o'zgartirish shart emas. OpenAI Whisper API'ga o'tish
     uchun `.env.example`dagi izohga qarang. Ovozli xabar aniqlanmasa, bot
     "matn bilan yozing" deb javob beradi — boshqa hech narsaga ta'sir qilmaydi.

2. Barcha xizmatlarni ishga tushiring:

   ```bash
   docker compose up -d --build
   ```

   Backend konteyneri ishga tushganda migratsiyalarni **avtomatik** qo'llaydi — qo'lda
   `alembic upgrade head` ishga tushirish shart emas.

3. Ochish:
   - Ilova: http://localhost
   - API hujjatlari (Swagger): http://localhost:8001/docs (faqat lokal dasturlash uchun —
     pastga qarang)

## VM'ga (server) o'rnatish

Internetsiz / proksi ortidagi VM uchun to'liq qo'llanma va bir buyruqli
o'rnatuvchi: **[`deploy/VM-DEPLOY.md`](deploy/VM-DEPLOY.md)**. Qisqacha:

```bash
./deploy/vm-setup.sh --proxy http://PROXY_HOST:3128   # .env + build + up, hammasi
./deploy/vm-update.sh                                 # yangi versiyaga o'tish
./deploy/vm-fix-db-auth.sh                            # "password authentication failed" ni tuzatish
./deploy/bundle.sh                                    # air-gap: image'larni bitta arxivga
```

Proksi qanday ulanishi (build-arg + runtime `environment:` + Docker demoni):
[`deploy/PROKSI-VA-VM.md`](deploy/PROKSI-VA-VM.md). Production `.env` namunasi:
[`.env.prod.example`](.env.prod.example).

## Lokal portlar va production

`docker-compose.yml` — production uchun xavfsiz asosiy fayl: faqat `nginx` xost portiga
(80) chiqadi, `postgres`/`backend`/`frontend` esa faqat ichki Docker tarmog'ida
(`mj_network`) bir-biriga ko'rinadi.

`docker-compose.override.yml` oddiy `docker compose up` chaqirilganda **avtomatik**
qo'shiladi (Docker Compose'ning standart xatti-harakati) va shu portlarni qulaylik uchun
xostga chiqaradi:

| Xizmat | Xost porti | Nima uchun |
|---|---|---|
| postgres | 5432 | `psql`/DB klient orqali to'g'ridan-to'g'ri ulanish |
| backend | 8001 | `curl`/Swagger (`/docs`) orqali to'g'ridan-to'g'ri sinash |
| frontend | 5173 | Vite dev-server'ga nginx'siz to'g'ridan-to'g'ri kirish |

**Production'ga chiqarishda bu faylni ULAMANG** — `-f` bayrog'i bilan aniq fayllarni
ko'rsating (bu holatda `docker compose` `docker-compose.override.yml`ni avtomatik
qo'shmaydi):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` nginx'ga HTTPS (443-port, TLS) qo'shadi — sertifikatni oldindan
`nginx/certs/`ga qo'yish kerak (qanday olish haqida `nginx/certs/README.md`ga qarang).

**Muhim:** `frontend`ning production build'i `VITE_API_URL`ni build vaqtida ichiga
"quyib qo'yadi" (Vite'ning ishlash tamoyili shunday — runtime env o'zgaruvchisi kech
qoladi). Haqiqiy domenga chiqarishdan oldin `.env`dagi `VITE_API_URL`ni
`https://sizning-domeningiz.com/api` ga o'zgartiring, keyin qayta build qiling.

`frontend/Dockerfile` ikki bosqichli: `dev` (Vite dev-server, faqat
`docker-compose.override.yml` orqali) va `production` (standart — `npm run build` bilan
tayyorlangan statik fayllar, o'zining yengil nginx'i orqali xizmat qiladi — Node.js
yakuniy image'da umuman yo'q).

## Zaxira nusxa

```bash
./scripts/backup-db.sh                              # backups/mj_db_<sana>.sql.gz yaratadi
./scripts/restore-db.sh backups/mj_db_2026....sql.gz # joriy ma'lumotlarni ALMASHTIRADI
```

`postgres_data` — oddiy Docker volume, o'zining zaxira mexanizmi yo'q, shu skriptni
muntazam (masalan kunlik cron orqali) ishga tushirish tavsiya etiladi.

## Arxitektura

```
MJ/
├── backend/                  FastAPI + SQLAlchemy 2.0 (async) + Alembic + APScheduler
├── frontend/                 React 19 + TypeScript + Tailwind CSS + TanStack Query
│   ├── Dockerfile              2 bosqich: dev (Vite) / production (statik + nginx)
│   └── nginx.static.conf       Production bosqichi ichidagi statik-fayl serveri konfiguratsiyasi
├── telegram_bot/             aiogram 3.x — backend/app modellari va servislarini
│                              Docker build vaqtida o'zgarishsiz qayta ishlatadi (kod takrorlanmaydi)
├── speaches                  (docker-compose xizmati, alohida papka emas) — bot uchun
│                              o'z serverida ishlaydigan bepul ovoz→matn (faster-whisper)
├── nginx/                    Reverse proxy: /api/* → backend, / → frontend
│   ├── nginx.conf             Standart (HTTP, dev)
│   └── nginx.prod.conf        HTTPS variant (docker-compose.prod.yml bilan)
├── scripts/                  backup-db.sh / restore-db.sh
├── docker-compose.yml         Asosiy, production-xavfsiz
├── docker-compose.override.yml  Dev qulayligi (avtomatik qo'shiladi)
└── docker-compose.prod.yml    HTTPS overlay
```

## Testlar

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                 # alohida mj_test_db bazasini avtomatik yaratadi
black --check app && ruff check app && mypy app
```

```bash
cd frontend
npm install
npm run typecheck && npm run lint && npm run build
npm test               # Vitest + Testing Library
```
