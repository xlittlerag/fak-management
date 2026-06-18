# Etapa Base
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable
WORKDIR /app

# Etapa Prod-Deps: Instalar dependencias de producción
FROM base AS prod-deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Etapa Build: Compilar Frontend y Backend
FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
# Build Frontend
RUN cd frontend && pnpm run build

# Generate Prisma Client (Must happen before backend build)
RUN pnpm exec prisma generate

# Build Backend
RUN pnpm run build

# Etapa Final: Runtime
FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000
CMD [ "node", "dist/main.js" ]
