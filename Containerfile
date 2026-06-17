# Etapa 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN cd frontend && pnpm run build
RUN pnpm run build
RUN pnpm exec prisma generate

# Etapa 2: Runtime
FROM node:22-alpine
WORKDIR /app

# Install only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# Copy build artifacts and runtime necessities
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000
CMD ["node", "dist/main.js"]
