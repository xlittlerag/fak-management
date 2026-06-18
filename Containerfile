# Etapa 1: Build
FROM node:lts-alpine AS builder
WORKDIR /app

# Install pnpm and configure it to approve build scripts automatically
RUN npm install -g pnpm && pnpm config set --global approve-builds true

# Install dependencies (using pnpm-workspace logic)
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
# Allow scripts for production dependencies too
RUN npm install -g pnpm && pnpm config set --global approve-builds true
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --no-frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000
CMD ["node", "dist/main.js"]
