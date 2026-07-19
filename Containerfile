# ============================================================
# Kendo Manager — Dockerfile (multi-stage)
# ============================================================

# Etapa Base -------------------------------------------------
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Etapa Prod-Deps --------------------------------------------
FROM base AS prod-deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN DATABASE_URL="file:./dev.db" pnpm exec prisma generate

# Etapa Build -------------------------------------------------
FROM base AS build
ARG VITE_MERCADO_PAGO_PUBLIC_KEY
ENV VITE_MERCADO_PAGO_PUBLIC_KEY=$VITE_MERCADO_PAGO_PUBLIC_KEY
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN DATABASE_URL="file:./dev.db" pnpm exec prisma generate
RUN cd frontend && pnpm run build
RUN pnpm run build

# Etapa Final: Runtime ----------------------------------------
FROM base
ENV NODE_ENV=production
ENV DB_DIR=/app/data
RUN groupadd -r kendo && useradd -r -g kendo -d /app -s /sbin/nologin kendo

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
COPY scripts /app/scripts

RUN mkdir -p /app/uploads /app/data && chown -R kendo:kendo /app

# rclone para backups externos (Google Drive, SFTP, S3, etc.)
RUN apt-get update && apt-get install -y rclone && rm -rf /var/lib/apt/lists/*

USER kendo
WORKDIR /app

EXPOSE 3000

VOLUME [ "/app/data", "/app/uploads" ]

# HEALTHCHECK no soportado en formato OCI (podman default).
# Usar al ejecutar: podman run --health-cmd="node -e \"require('http').get('http://localhost:3000/',()=>process.exit(0)).on('error',()=>process.exit(1))\"" --health-interval=30s --health-start-period=15s

ENTRYPOINT [ "/app/docker-entrypoint.sh" ]
