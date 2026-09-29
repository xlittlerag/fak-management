#!/bin/sh
set -e
umask 077

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

# La passphrase cifra el backup (AES-256-CBC con PBKDF2). Sin ella el backup
# saldría en claro con PII: se exige siempre. Guárdela fuera del servidor
# (gestor de secretos); sin ella el backup es irrecuperable.
if [ -z "$BACKUP_PASSPHRASE" ]; then
  echo "Error: BACKUP_PASSPHRASE no está configurada. Sin ella no se genera el backup."
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

if [ ! -f "$DB_FILE" ]; then
  echo "Error: No se encuentra la base de datos en $DB_FILE"
  exit 1
fi

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_NAME="kendo-backup-$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

mkdir -p "$BACKUP_PATH"

echo "→ Creando backup: $BACKUP_NAME"

# Snapshot consistente vía SQLite (cp en caliente puede salir corrupto).
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_FILE" ".backup '$BACKUP_PATH/database.db'"
  echo "  ✓ Snapshot de base de datos ($(du -h "$BACKUP_PATH/database.db" | cut -f1))"
else
  echo "  ⚠ sqlite3 no disponible: copia directa (puede ser inconsistente)"
  cp "$DB_FILE" "$BACKUP_PATH/database.db"
fi

if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
  cp -r "$UPLOADS_DIR" "$BACKUP_PATH/uploads"
  echo "  ✓ Uploads copiados ($(du -sh "$UPLOADS_DIR" | cut -f1))"
else
  mkdir -p "$BACKUP_PATH/uploads"
  echo "  ✓ Uploads vacíos, directorio creado"
fi

echo "$TIMESTAMP" > "$BACKUP_PATH/.timestamp"

ARCHIVE="/tmp/kendo-backup-$TIMESTAMP.tar.gz"
ENCRYPTED="$ARCHIVE.enc"
tar -czf "$ARCHIVE" -C "$BACKUP_DIR" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"

echo "  ✓ Comprimido: $(du -h "$ARCHIVE" | cut -f1)"

openssl enc -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE \
  -in "$ARCHIVE" -out "$ENCRYPTED"
chmod 600 "$ENCRYPTED"
rm -f "$ARCHIVE"

echo "  ✓ Cifrado: $(du -h "$ENCRYPTED" | cut -f1)"

echo "→ Subiendo a $BACKUP_DEST..."
rclone copy "$ENCRYPTED" "$BACKUP_DEST/" --progress 2>&1 || {
  echo "Error: Falló la subida a $BACKUP_DEST"
  rm -f "$ENCRYPTED"
  exit 1
}

echo "  ✓ Backup subido exitosamente"

rm -f "$ENCRYPTED"

echo "→ Limpiando backups remotos anteriores a $RETENTION_DAYS días..."
if ! rclone delete --min-age "${RETENTION_DAYS}d" "$BACKUP_DEST/"; then
  echo "  ⚠ Falló la limpieza de retención: revise el espacio en $BACKUP_DEST"
fi

echo ""
echo "=== Backup completado ==="
echo "  Destino: $BACKUP_DEST/$BACKUP_NAME.tar.gz.enc"
echo "  Fecha:   $TIMESTAMP"
