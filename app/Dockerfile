# Dokploy app : build context = racine du monorepo, dockerfile = app/Dockerfile.
# À déployer comme App Dokploy indépendante (type Dockerfile).
#
# App 100% client-only (Pinia + localStorage, pas de backend) : aucune
# variable d'environnement n'est nécessaire au build.

FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY app/package.json app/package.json
RUN npm ci

COPY app ./app

WORKDIR /repo/app
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /repo/app/dist /usr/share/nginx/html
COPY app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
