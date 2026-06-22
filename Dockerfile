# Etapa Base
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable
WORKDIR /app

# Instalar herramientas de compilación necesarias para bcrypt/native modules y openssl para prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Etapa Prod-Deps: Instalar dependencias de producción y generar cliente de producción
FROM base AS prod-deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
COPY prisma ./prisma
# Se genera con una URL dummy porque Prisma exige tener la variable definida en esta etapa
RUN DATABASE_URL="postgresql://localhost:5432" pnpm exec prisma generate

# Etapa Build: Compilar Frontend y Backend
FROM base AS build
ARG VITE_MERCADO_PAGO_PUBLIC_KEY
ENV VITE_MERCADO_PAGO_PUBLIC_KEY=$VITE_MERCADO_PAGO_PUBLIC_KEY
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
# 1. Generar tipos locales para que TypeScript no falle durante "pnpm run build"
RUN DATABASE_URL="postgresql://localhost:5432" pnpm exec prisma generate

# Build Frontend & Backend
RUN cd frontend && pnpm run build
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
