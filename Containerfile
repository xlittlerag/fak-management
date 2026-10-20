# ============================================================
# Kendo Manager — Dockerfile (multi-stage)
# ============================================================

# Etapa Base -------------------------------------------------
# Sin corepack/pnpm: el runtime no los necesita (ver etapa Final).
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
WORKDIR /app

# Los paquetes del SO se actualizan a sus versiones parcheadas (la imagen base
# puede traer CVEs ya resueltos en bookworm-security).
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && apt-get install -y --no-install-recommends openssl rclone sqlite3 \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Etapa de tooling: corepack/pnpm solo existen en build/prod-deps.
FROM base AS tooling
RUN corepack enable

# Etapa Build -------------------------------------------------
FROM tooling AS build
ARG VITE_MERCADO_PAGO_PUBLIC_KEY
ENV VITE_MERCADO_PAGO_PUBLIC_KEY=$VITE_MERCADO_PAGO_PUBLIC_KEY

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN cd frontend && pnpm run build
RUN pnpm run build

# Etapa de dependencias de producción -------------------------
# Instala la closure de prod desde cero (sin node_modules de desarrollo) para
# que la imagen final la copie una sola vez y sin poda.
FROM tooling AS prod-deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
# El "prepare" (husky) es dev-only y rompería la instalación de producción.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));delete p.scripts.prepare;fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
# Los build scripts están restringidos por allowBuilds en pnpm-workspace.yaml;
# son necesarios para los binarios nativos (better-sqlite3, esbuild) y el motor
# de Prisma. La generación del cliente se declara explícita por claridad.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN pnpm exec prisma generate

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

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/prisma ./prisma

# Runtime mínimo: se elimina npm (no se usa en ejecución) para no arrastrar sus
# dependencias internas con CVEs; el entrypoint invoca prisma/tsx por path.
# corepack/pnpm nunca llegan a esta etapa (base no los instala).
# Ver docs/iteraciones/23-remediacion-cves.md.
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

COPY --from=build /app/dist /app/dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
COPY scripts /app/scripts

# Solo los directorios escribibles quedan para kendo; el resto es de lectura.
RUN mkdir -p /app/uploads /app/data && chown kendo:kendo /app/data /app/uploads

USER kendo
WORKDIR /app

EXPOSE 3000

VOLUME [ "/app/data", "/app/uploads" ]

ENTRYPOINT [ "/app/docker-entrypoint.sh" ]
