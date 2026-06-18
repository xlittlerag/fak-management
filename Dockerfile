# Etapa 1: Build
FROM node:lts-alpine AS builder
WORKDIR /app

# Habilitar corepack y preparar pnpm (sin problemas de PATH)
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm config set --global approve-builds true

# Instalar dependencias
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY . .
RUN cd frontend && pnpm run build
RUN pnpm run build
RUN pnpm exec prisma generate

# Etapa 2: Runtime
FROM node:lts-alpine
WORKDIR /app
# Habilitar corepack para la etapa de runtime
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm config set --global approve-builds true

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --no-frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000
CMD ["node", "dist/main.js"]
