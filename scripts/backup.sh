#!/bin/sh
set -e

BACKUP_DEST="${BACKUP_DEST:-}"
APP_DIR="${APP_DIR:-/app}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

if [ -z "$BACKUP_DEST" ]; then
  echo "Error: BACKUP_DEST no está configurada."
  echo "Uso: BACKUP_DEST='gdrive:backups/kendo' $0"
  echo "     BACKUP_DEST='sftp:user@host:/backups' $0"
  exit 1
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

UPLOADS_DIR="$APP_DIR/uploads"

# Validar que exista
if [ ! -f "$DB_FILE" ] && [ ! -f "${DB_FILE}.db" ]; then
  # Puede que el archivo no tenga extensión .db
  if [ ! -f "$DB_FILE" ]; then
    echo "Error: No se encuentra la base de datos en $DB_FILE"
    exit 1
  fi
fi

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_NAME="kendo-backup-$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

mkdir -p "$BACKUP_PATH"

echo "→ Creando backup: $BACKUP_NAME"

cp "$DB_FILE" "$BACKUP_PATH/database.db"
echo "  ✓ Base de datos copiada ($(du -h "$DB_FILE" | cut -f1))"

if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
  cp -r "$UPLOADS_DIR" "$BACKUP_PATH/uploads"
  echo "  ✓ Uploads copiados ($(du -sh "$UPLOADS_DIR" | cut -f1))"
else
  mkdir -p "$BACKUP_PATH/uploads"
  echo "  ✓ Uploads vacíos, directorio creado"
fi

echo "$TIMESTAMP" > "$BACKUP_PATH/.timestamp"
echo "$DATABASE_URL" > "$BACKUP_PATH/.db-url"

ARCHIVE="/tmp/kendo-backup-$TIMESTAMP.tar.gz"
tar -czf "$ARCHIVE" -C "$BACKUP_DIR" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"

echo "  ✓ Comprimido: $(du -h "$ARCHIVE" | cut -f1)"

echo "→ Subiendo a $BACKUP_DEST..."
rclone copy "$ARCHIVE" "$BACKUP_DEST/" --progress 2>&1 || {
  echo "Error: Falló la subida a $BACKUP_DEST"
  rm -f "$ARCHIVE"
  exit 1
}

echo "  ✓ Backup subido exitosamente"

rm -f "$ARCHIVE"

echo "→ Limpiando backups remotos anteriores a $RETENTION_DAYS días..."
rclone delete --min-age "${RETENTION_DAYS}d" "$BACKUP_DEST/" 2>/dev/null || true

echo ""
echo "=== Backup completado ==="
echo "  Destino: $BACKUP_DEST/$BACKUP_NAME.tar.gz"
echo "  Fecha:   $TIMESTAMP"
