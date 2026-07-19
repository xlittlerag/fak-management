# ============================================================
# Kendo Manager — Dockerfile (multi-stage)
# ============================================================

# Etapa Base -------------------------------------------------
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && apt-get install -y openssl rclone

# Etapa Build -------------------------------------------------
FROM base AS build
ARG VITE_MERCADO_PAGO_PUBLIC_KEY
ENV VITE_MERCADO_PAGO_PUBLIC_KEY=$VITE_MERCADO_PAGO_PUBLIC_KEY

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN cd frontend && pnpm run build
RUN pnpm run build

# Etapa Final: Runtime ----------------------------------------
FROM base
ENV NODE_ENV=production
ENV DB_DIR=/app/data
RUN groupadd -r kendo && useradd -r -g kendo -d /app -s /sbin/nologin kendo

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --from=build /app/dist /app/dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
COPY scripts /app/scripts

RUN mkdir -p /app/uploads /app/data && chown -R kendo:kendo /app

USER kendo
WORKDIR /app

EXPOSE 3000

VOLUME [ "/app/data", "/app/uploads" ]

ENTRYPOINT [ "/app/docker-entrypoint.sh" ]
