#!/bin/sh
set -e

BACKUP_DEST="${BACKUP_DEST:-}"
APP_DIR="${APP_DIR:-/app}"
RESTORE_DIR="/tmp/kendo-restore"

if [ -z "$BACKUP_DEST" ]; then
  echo "Error: BACKUP_DEST no está configurada."
  echo "Uso: BACKUP_DEST='gdrive:backups/kendo' $0 [nombre-backup]"
  exit 1
fi

echo "→ Backups disponibles en $BACKUP_DEST:"
rclone tree "$BACKUP_DEST/" 2>/dev/null | head -30 || rclone ls "$BACKUP_DEST/" 2>/dev/null

echo ""
RESTORE_FILE="$1"

if [ -z "$RESTORE_FILE" ]; then
  echo "Uso: $0 <nombre-del-archivo-backup.tar.gz>"
  echo "Ej:  $0 kendo-backup-2026-07-14_133000.tar.gz"
  exit 1
fi

echo "→ Descargando $RESTORE_FILE desde $BACKUP_DEST..."
mkdir -p "$RESTORE_DIR"
rclone copy "$BACKUP_DEST/$RESTORE_FILE" "$RESTORE_DIR/" --progress 2>&1

LOCAL_ARCHIVE="$RESTORE_DIR/$RESTORE_FILE"
if [ ! -f "$LOCAL_ARCHIVE" ]; then
  echo "Error: No se pudo descargar $RESTORE_FILE"
  rm -rf "$RESTORE_DIR"
  exit 1
fi

echo "→ Extrayendo..."
tar -xzf "$LOCAL_ARCHIVE" -C "$RESTORE_DIR"
EXTRACTED_DIR="$RESTORE_DIR/$(basename "$RESTORE_FILE" .tar.gz)"

if [ ! -d "$EXTRACTED_DIR" ]; then
  echo "Error: Archivo de backup inválido"
  rm -rf "$RESTORE_DIR"
  exit 1
fi

echo ""
echo "=== Backup a restaurar ==="
echo "  Fecha: $(cat "$EXTRACTED_DIR/.timestamp" 2>/dev/null || echo 'desconocida')"
echo "  DB:    $(ls -lh "$EXTRACTED_DIR/database.db" 2>/dev/null | awk '{print $5}')"
echo "  Uploads: $(ls "$EXTRACTED_DIR/uploads" 2>/dev/null | wc -l) archivos"
echo ""

if [ "$FORCE" != "yes" ]; then
  echo "ADVERTENCIA: Esto SOBREESCRIBIRÁ la base de datos y uploads actuales."
  printf "¿Continuar? (s/N): "
  read -r CONFIRM < /dev/tty 2>/dev/null || CONFIRM="n"
  if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    echo "Restore cancelado."
    rm -rf "$RESTORE_DIR"
    exit 0
  fi
fi

# Determinar ubicación de la DB
DB_PATH="${DATABASE_URL:-file:./dev.db}"
DB_PATH="${DB_PATH#file:}"
DB_PATH="${DB_PATH#file://}"

if echo "$DB_PATH" | grep -q '^/'; then
  DB_FILE="$DB_PATH"
else
  DB_FILE="$APP_DIR/$DB_PATH"
fi

cp "$EXTRACTED_DIR/database.db" "$DB_FILE"
echo "  ✓ Base de datos restaurada en $DB_FILE"

if [ -d "$EXTRACTED_DIR/uploads" ]; then
  UPLOADS_DIR="$APP_DIR/uploads"
  mkdir -p "$UPLOADS_DIR"
  cp -r "$EXTRACTED_DIR/uploads/"* "$UPLOADS_DIR/"
  echo "  ✓ Uploads restaurados en $UPLOADS_DIR"
fi

rm -rf "$RESTORE_DIR"

echo ""
echo "=== Restore completado ==="
echo "  Backup: $RESTORE_FILE"
echo ""
echo "IMPORTANTE: Reiniciá la aplicación para que tome los cambios:"
echo "  podman restart <container>"
