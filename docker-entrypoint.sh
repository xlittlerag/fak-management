#!/bin/sh
set -e

echo "→ Ejecutando prisma db push..."
npx prisma db push 2>&1

echo "→ Iniciando aplicación..."
exec node dist/main.js
