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

2. Barcha xizmatlarni ishga tushiring:

   ```bash
   docker compose up -d --build
   ```

   Backend konteyneri ishga tushganda migratsiyalarni **avtomatik** qo'llaydi — qo'lda
   `alembic upgrade head` ishga tushirish shart emas.

3. Ochish:
   - Ilova: http://localhost
   - API hujjatlari (Swagger): http://localhost:8000/docs

## Arxitektura

```
MJ/
├── backend/        FastAPI + SQLAlchemy 2.0 (async) + Alembic + APScheduler
├── frontend/        React 18 + TypeScript + Tailwind CSS + TanStack Query
├── telegram_bot/     aiogram 3.x — backend/app modellari va servislarini
│                      Docker build vaqtida o'zgarishsiz qayta ishlatadi (kod takrorlanmaydi)
├── nginx/            Reverse proxy: /api/* → backend, / → frontend
└── docker-compose.yml
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
```
