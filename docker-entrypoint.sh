#!/bin/sh
set -e

echo "→ Ejecutando prisma db push..."
npx prisma db push --skip-generate

echo "→ Iniciando aplicación..."
exec node dist/main.js
