# Shared base: installs deps once, reused by both the dev and build stages.
FROM node:22-alpine AS base
WORKDIR /app

# --- Proksi (internetsiz VM: build vaqtida `npm install` Squid orqali chiqadi;
#     runtime nginx bosqichiga proksi kerak emas) ----------------------------
# npm standart HTTP_PROXY'ni har doim hurmat qilmaydi -> npm_config_* ham beramiz.
# .env -> docker-compose build.args -> shu ARG'lar. Bo'sh bo'lsa proksisiz.
ARG HTTP_PROXY=
ARG HTTPS_PROXY=
ARG NO_PROXY=
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    http_proxy=${HTTP_PROXY} \
    https_proxy=${HTTPS_PROXY} \
    no_proxy=${NO_PROXY} \
    npm_config_proxy=${HTTP_PROXY} \
    npm_config_https_proxy=${HTTPS_PROXY}

COPY package*.json ./
RUN npm install

# --- Dev target: hot-reloading Vite dev server (see docker-compose.override.yml) ---
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# --- Build stage: compiles the static production bundle ---
FROM base AS build
# Vite inlines import.meta.env.VITE_* values at build time, so this must be
# passed as a build arg (see docker-compose.yml's build.args), not a runtime
# env var — a container env var set after the build would have no effect.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm run build

# --- Production target (default/last stage): the compiled bundle served by a
# plain static-file nginx — no Node.js in the final image, no dev server. ---
FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.static.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
