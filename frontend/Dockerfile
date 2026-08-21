# Shared base: installs deps once, reused by both the dev and build stages.
FROM node:22-alpine AS base
WORKDIR /app
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
