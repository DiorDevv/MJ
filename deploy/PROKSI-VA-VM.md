# Internetsiz VM — Squid proksi orqali (yoki to'liq air-gap)

VM to'g'ridan-to'g'ri internetga chiqa olmaydi. Chiqish Squid (yoki boshqa HTTP)
proksi orqali. Muammo **4 nuqtada** hal qilinadi — hammasiga **bir xil**
`HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` beriladi. Proksi umuman bo'lmasa —
oxiridagi `docker save` / `docker load` yo'li.

`PROXY_HOST:3128` — Squid manzilingiz bilan almashtiring.

> **MJ SD/Squid'dan farqi:** MJ konteynerlari RUNTIME'da ham tashqariga chiqadi
> (`bot` → api.telegram.org doimiy; `backend` → Web Push xizmatlari;
> `speaches` → huggingface.co, faqat birinchi startda model yuklash). Shuning
> uchun proksi build-arg'dan tashqari `docker-compose.yml`dagi `backend` / `bot`
> / `speaches` xizmatlarining `environment:` bo'limiga ham berilgan — u yerda
> `${HTTP_PROXY:-}` orqali `.env` dan o'qiladi.

---

## Nuqta 1 — Docker demoni (base image'larni `docker pull` qilish)

`python:3.11-slim`, `node:22-alpine`, `nginx:1.27-alpine`, `postgres:16-alpine`,
`ghcr.io/speaches-ai/speaches:latest-cpu` — bularni **Docker demoni** tortadi.
Demon `.env` ni ham, `build-arg` ni ham o'qimaydi — unga alohida proksi beriladi:

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf <<'EOF'
[Service]
Environment="HTTP_PROXY=http://PROXY_HOST:3128"
Environment="HTTPS_PROXY=http://PROXY_HOST:3128"
Environment="NO_PROXY=localhost,127.0.0.1,::1"
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker

docker pull hello-world      # ishlashi kerak
```

> `./deploy/vm-setup.sh --proxy http://PROXY_HOST:3128` shu faylni siz uchun
> yozadi (yoki mavjud bo'lsa avtomatik o'qib oladi).

---

## Nuqta 2 — Build vaqti (`apt`, `pip`, `npm` — `RUN` ichida)

`backend/Dockerfile` va `telegram_bot/Dockerfile` da `apt-get` (gcc, libpq-dev)
bor, `frontend/Dockerfile` da `npm install`. Uchala Dockerfile ham
`ARG HTTP_PROXY/HTTPS_PROXY/NO_PROXY` qabul qiladi va `ENV` ga o'tkazadi
(`npm` uchun qo'shimcha `npm_config_proxy` / `npm_config_https_proxy` — npm
standart env'ni har doim hurmat qilmaydi).

`docker-compose.yml` bu qiymatlarni `.env` dan `build.args` ga uzatadi. Sizga
faqat `.env` ni to'ldirish qoladi:

```ini
HTTP_PROXY=http://PROXY_HOST:3128
HTTPS_PROXY=http://PROXY_HOST:3128
NO_PROXY=localhost,127.0.0.1,::1,postgres,backend,frontend,bot,speaches,nginx
```

> **`NO_PROXY` ga compose servis nomlarini (`postgres`, `backend`, ...) qo'shish
> SHART** — aks holda backend → `postgres:5432`, bot → `backend:8000`,
> bot → `speaches:8000` trafigi ham proksiga yuboriladi va buziladi.

So'ng odatiy tarzda:

```bash
docker compose -f docker-compose.yml up -d --build
```

---

## Nuqta 3 — Runtime (konteyner ishlab turganda)

MJ'da bu **kerak** (SD'dan farqi shu):

| Xizmat | Tashqi chiqish | Qachon |
|--------|----------------|--------|
| `bot` | api.telegram.org | doimiy (long-polling) |
| `backend` | Web Push endpointlari (FCM, Mozilla, ...) | push yuborilganda |
| `backend` | api.telegram.org | eslatma yuborilganda (notification_service) |
| `speaches` | huggingface.co | faqat 1-marta (model ~500MB), keyin kesh |

`docker-compose.yml` bu uchala xizmatning `environment:` bo'limiga
`HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` ni `${...:-}` orqali qo'shgan — ya'ni
Nuqta 2 dagi `.env` qiymatlari runtime'ga ham yetadi. Alohida ish qilish shart emas.

> `speaches` modelni keshga yozgach (`speaches_models` volume) tashqi chiqish
> shart emas. Proksi umuman yo'q bo'lsa — ovozli xabar funksiyasi ishlamaydi,
> bot "matn bilan yozing" deb javob beradi, qolgani ishlayveradi.

---

## Nuqta 4 — apt / git / openssl (host'da, Docker o'rnatishda)

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

---

## Muqobil — to'liq air-gap (proksi ham yo'q)

Internetli mashinada `docker save`, VM'da `docker load`.

**Internetli mashinada** (repo klon qilingan):

```bash
./deploy/bundle.sh              # -> mj-bundle.tgz
```

**VM'ga ko'chirib** (`scp mj-bundle.tgz user@VM:~/`):

```bash
gunzip -c ~/mj-bundle.tgz | docker load

cd ~/MJ
cp .env.prod.example .env && nano .env   # sirlarni to'ldiring; HTTP_PROXY BO'SH
docker compose -f docker-compose.yml up -d --no-build
```

`--no-build` — hech narsa tortilmaydi/qurilmaydi, faqat `docker load` qilingan
image'lardan (`mj-backend`, `mj-frontend`, `mj-bot`, ...) ishga tushadi.

> Air-gap'da `bot` va `speaches` tashqariga chiqa olmaydi: Telegram bot va
> ovozli xabar ishlamaydi. Sayt + vazifalar (web) to'liq ishlaydi.

---

## Xulosa

| Nuqta | Qayerda | Nima uchun |
|-------|---------|-----------|
| 1. Demon | `/etc/systemd/system/docker.service.d/http-proxy.conf` | `docker pull` base image'lar |
| 2. Build | `.env` → compose `build.args` → Dockerfile `ARG/ENV` | `apt`, `pip`, `npm ci` |
| 3. Runtime | `.env` → compose `environment:` (`backend`/`bot`/`speaches`) | Telegram, Web Push, HuggingFace |
| 4. Host | `apt.conf.d/95proxy`, `profile.d/proxy.sh` | Docker'ni o'rnatish, `git clone` |
| Air-gap | `deploy/bundle.sh` → `docker load` → `up --no-build` | proksi ham bo'lmasa |
