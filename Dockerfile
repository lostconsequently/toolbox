# syntax=docker/dockerfile:1

# Build context is the repository root: this image contains both halves.

FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# Vite bakes this in at build time; it is not read at container runtime. A
# relative path keeps the app pointed at whatever origin it is served from.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# sqlite3 is a native module and needs a build toolchain.
FROM node:22-bookworm-slim AS backend-deps
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# openssl    -> Certificate Toolkit (routes/certificates.js) shells out to it.
# iputils-ping / traceroute -> Ping Tool & Traceroute (utils/pingRunner.js,
#   utils/tracerouteRunner.js) shell out to the OS binaries.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       openssl iputils-ping traceroute ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/db/toolbox.db \
    BACKUP_DIR=/data/backups \
    TEMP_DIR=/data/temp \
    LOG_DIR=/data/logs

COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/ ./
COPY --from=frontend-build /app/dist ./public

# Fresh named volumes are empty directories; app.js/db.js/backup.js also
# mkdir -p these at startup, this just avoids a first-run race.
RUN mkdir -p /data/db /data/backups /data/temp /data/logs

EXPOSE 3001

# Uses Node itself so no extra package is needed just for the healthcheck.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "app.js"]
