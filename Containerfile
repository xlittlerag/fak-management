# ============================================================
# Kendo Manager — Dockerfile (multi-stage)
# ============================================================

# Etapa Base -------------------------------------------------
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable
WORKDIR /app

# Los paquetes del SO se actualizan a sus versiones parcheadas (la imagen base
# puede traer CVEs ya resueltos en bookworm-security).
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && apt-get install -y --no-install-recommends openssl rclone sqlite3 \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

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
ARG VERSION=dev
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="kendo-manager" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$GIT_SHA" \
      org.opencontainers.image.source="https://github.com/xlittlerag/fak-management"
ENV NODE_ENV=production
ENV DB_DIR=/app/data
RUN groupadd -r kendo && useradd -r -g kendo -d /app -s /sbin/nologin kendo

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --ignore-scripts

# Runtime mínimo: se eliminan npm/npx y corepack/pnpm (no se usan en ejecución) para
# no arrastrar sus dependencias internas con CVEs; el entrypoint invoca prisma/tsx
# por path. Ver docs/iteraciones/23-remediacion-cves.md.
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /root/.cache/node /pnpm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx \
             /usr/local/bin/pnpm /usr/local/bin/pnpx \
             /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/corepack

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
