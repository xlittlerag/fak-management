# syntax=docker/dockerfile:1.7
# ============================================================
# Kendo Manager — Dockerfile (multi-stage)
# ============================================================

# Etapa Base -------------------------------------------------
# Digest pineado: evita que cada push del tag `slim` invalide todas las capas
# (apt + pnpm install + builds) en el cache de CI. Bumpear con Renovate/Dependabot.
FROM node:26-slim@sha256:36793bcbb160a6a16cede1e62b93f84e26b78a972a8a4c0b879c1c12f22761ec AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
WORKDIR /app

# Solo paquetes de runtime. El `upgrade` se sacó: el digest pineado ya trae los
# parches y el scan de Trivy hace de compuerta (ver docs/iteraciones/23 y 26).
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && apt-get install -y --no-install-recommends openssl rclone sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Etapa de tooling: pnpm solo existe en build; el runtime final hereda de `base`.
# Node 26 ya no trae corepack, así que pnpm se instala con npm (presente en la
# imagen oficial y eliminado en la etapa final).
FROM base AS tooling
ARG PNPM_VERSION=11.11.0
RUN npm install -g pnpm@${PNPM_VERSION} \
    && pnpm config set store-dir /pnpm/store --global

# Etapa de dependencias --------------------------------------
# Una sola instalación (dev + prod) compartida por los builds y por la closure
# de producción: antes se instalaba dos veces.
FROM tooling AS deps
# El "prepare" (husky) es dev-only y rompería la instalación en la imagen.
ENV HUSKY=0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=cache,id=pnpm-cache,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile

# Builds en paralelo (BuildKit ejecuta las etapas independientes a la vez).
FROM deps AS fe-build
# Vite inlinea las variables VITE_* en build time (clave pública de Mercado Pago).
ARG VITE_MERCADO_PAGO_PUBLIC_KEY
ENV VITE_MERCADO_PAGO_PUBLIC_KEY=$VITE_MERCADO_PAGO_PUBLIC_KEY
COPY . .
RUN pnpm --filter frontend run build

FROM deps AS be-build
COPY . .
RUN pnpm run build

# Closure de producción en su propia etapa (sin node_modules de desarrollo).
# Se materializa desde el store ya poblado: `pnpm deploy` copiaba 400 MB y
# medía ~50 s, contra ~16 s de esta instalación
# (ver docs/iteraciones/26-build-performance.md).
FROM tooling AS prod-deps
ENV HUSKY=0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
# El "prepare" (husky) es dev-only: con --prod no está instalado y rompería la
# instalación. Se quita del manifiesto solo en esta etapa.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));delete p.scripts.prepare;fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=cache,id=pnpm-cache,target=/root/.cache/pnpm \
    pnpm install --prod --frozen-lockfile
# El cliente Prisma se genera en el `postinstall` del propio install.

# Etapa Final: Runtime ----------------------------------------
# Hereda de `prod-deps` (node_modules de producción ya materializado) para no
# copiar 400 MB en una capa nueva: esa copia costaba ~35 s del build.
FROM prod-deps AS final
ARG VERSION=dev
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="kendo-manager" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$GIT_SHA" \
      org.opencontainers.image.source="https://github.com/xlittlerag/fak-management"
ENV NODE_ENV=production
ENV DB_DIR=/app/data
RUN groupadd -r kendo && useradd -r -g kendo -d /app -s /sbin/nologin kendo

COPY --from=be-build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=be-build /app/prisma ./prisma

# Runtime mínimo: se eliminan npm, pnpm y sus caches (no se usan en ejecución)
# para no arrastrar dependencias internas con CVEs; el entrypoint invoca
# prisma/tsx por path. Ver docs/iteraciones/23-remediacion-cves.md.
RUN rm -rf /usr/local/lib/node_modules/npm /pnpm /root/.npm /root/.config/pnpm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/pnpm

COPY --from=be-build /app/dist /app/dist
COPY --from=fe-build /app/frontend/dist ./frontend/dist
COPY --from=be-build /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
COPY scripts /app/scripts

# Solo los directorios escribibles quedan para kendo; el resto es de lectura.
RUN mkdir -p /app/uploads /app/data && chown kendo:kendo /app/data /app/uploads

USER kendo
WORKDIR /app

EXPOSE 3000

VOLUME [ "/app/data", "/app/uploads" ]

ENTRYPOINT [ "/app/docker-entrypoint.sh" ]
