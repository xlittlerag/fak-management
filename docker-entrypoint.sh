#!/bin/sh
set -e

DB_DIR="${DB_DIR:-/app/data}"
DB_FILE="${DB_FILE:-devdb}"
mkdir -p "$DB_DIR"

echo "→ Ejecutando prisma db push..."
cat > "$DB_DIR/prisma.config.ts" << 'CONFIG'
import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: '/app/prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL || 'file:devdb' },
});
CONFIG
cd "$DB_DIR"
DATABASE_URL="file:${DB_FILE}" node /app/node_modules/prisma/build/index.js db push 2>&1

echo "→ Verificando admin general..."
DATABASE_URL="file:${DB_FILE}" node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { hash } = require('@node-rs/argon2');

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || 'file:./dev.db',
  });
  const prisma = new PrismaClient({ adapter });
  await prisma.\$connect();

  const count = await prisma.adminGeneral.count();
  if (count === 0) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.length < 15) {
      console.error('ERROR: defina ADMIN_PASSWORD con al menos 15 caracteres para crear el admin general.');
      process.exit(1);
    }
    const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await prisma.adminGeneral.create({
      data: { dni: '00000000', password: passwordHash },
    });
    console.log('✓ Admin general creado (DNI: 00000000)');
  } else {
    console.log('✓ Admin general ya existe, omitiendo');
  }

  await prisma.\$disconnect();
}
main().catch(e => { console.error('Error al crear admin:', e); process.exit(1); });
" 2>&1

if [ "${SEED_DATABASE}" = "true" ]; then
  if [ "${NODE_ENV}" = "production" ]; then
    echo "ERROR: SEED_DATABASE=true está prohibido en producción (borra datos reales)." >&2
    exit 1
  fi
  echo "→ Cargando datos de prueba (SEED_DATABASE=true)..."
  cd /app
  DATABASE_URL="file:${DB_DIR}/${DB_FILE}" node /app/node_modules/tsx/dist/cli.mjs prisma/seed.ts 2>&1
fi

echo "→ Iniciando aplicación..."
cd /app
export DATABASE_URL="file:${DB_DIR}/${DB_FILE}"
exec node dist/main.js
