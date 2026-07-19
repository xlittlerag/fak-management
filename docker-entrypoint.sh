#!/bin/sh
set -e

DB_DIR="${DB_DIR:-/app/data}"
DB_FILE="${DB_FILE:-devdb}"
mkdir -p "$DB_DIR"

echo "→ Ejecutando prisma db push..."
cd "$DB_DIR"
DATABASE_URL="file:${DB_FILE}" npx prisma db push 2>&1

echo "→ Verificando admin general..."
DATABASE_URL="file:${DB_FILE}" node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcrypt');

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || 'file:./dev.db',
  });
  const prisma = new PrismaClient({ adapter });
  await prisma.\$connect();

  const count = await prisma.adminGeneral.count();
  if (count === 0) {
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';
    const hash = await bcrypt.hash(password, 10);
    await prisma.adminGeneral.create({
      data: { dni: '00000000', password: hash },
    });
    console.log('✓ Admin general creado (DNI: 00000000)');
  } else {
    console.log('✓ Admin general ya existe, omitiendo');
  }

  await prisma.\$disconnect();
}
main().catch(e => { console.error('Error al crear admin:', e); process.exit(1); });
" 2>&1

echo "→ Iniciando aplicación..."
cd /app
export DATABASE_URL="file:${DB_DIR}/${DB_FILE}"
exec node dist/main.js
