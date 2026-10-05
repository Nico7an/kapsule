# syntax=docker/dockerfile:1

# ----------------------------------------------------------------- tests ----
FROM node:24-bookworm-slim AS tests
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci
COPY server/src/ ./server/src/
COPY server/test/ ./server/test/
RUN cd server && npm test

# ----------------------------------------------------------------- build ----
FROM node:24-bookworm-slim AS build
WORKDIR /app

# 1. Compilation de l'interface React / Vite
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci

COPY web/ ./web/
RUN cd web && npm run build

# 2. Dépendances de production du serveur
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# --------------------------------------------------------------- runtime ----
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    CYBER_DB=/data/cyber.db \
    CYBER_STATIQUES=/app/web/dist \
    TZ=Europe/Paris

COPY --from=build /app/server/node_modules ./server/node_modules/
COPY --from=build /app/server/package.json ./server/
COPY server/src/ ./server/src/
COPY --from=build /app/web/dist/ ./web/dist/

RUN mkdir -p /data && chown -R node:node /data /app

VOLUME ["/data"]
EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/sante').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/index.js"]
