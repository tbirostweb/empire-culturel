# Dokploy app : build context = racine du monorepo, dockerfile = app/Dockerfile.
# À déployer comme App Dokploy indépendante (type Dockerfile).
#
# App 100% client-only (Pinia + localStorage, pas de backend) : aucune
# variable d'environnement n'est nécessaire au build.

FROM node:22.19-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY app/package.json app/package.json
RUN npm ci

COPY app ./app

WORKDIR /repo/app
RUN npm run build

# Runtime non privilégié (UID 101, port 8080). Tags précis ; épingler le digest
# (`image@sha256:...`) après validation sur l'infrastructure : cf. rapport.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY --from=build /repo/app/dist /usr/share/nginx/html
COPY app/nginx.conf /etc/nginx/conf.d/default.conf
USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1
