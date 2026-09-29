#!/bin/sh
set -e
umask 077

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
  echo "Uso: $0 <nombre-del-archivo-backup.tar.gz.enc>"
  echo "Ej:  $0 kendo-backup-2026-07-14_133000.tar.gz.enc"
  exit 1
fi

case "$RESTORE_FILE" in
  *.enc)
    if [ -z "$BACKUP_PASSPHRASE" ]; then
      echo "Error: BACKUP_PASSPHRASE no está configurada. Sin ella no se puede descifrar."
      exit 1
    fi
    CIFRADO="si"
    ;;
  *)
    echo "ADVERTENCIA: backup sin cifrar (formato legacy). Se restaura igual, pero genere uno nuevo cifrado."
    CIFRADO="no"
    ;;
esac

echo "→ Descargando $RESTORE_FILE desde $BACKUP_DEST..."
mkdir -p "$RESTORE_DIR"
rclone copy "$BACKUP_DEST/$RESTORE_FILE" "$RESTORE_DIR/" --progress 2>&1

LOCAL_ARCHIVE="$RESTORE_DIR/$RESTORE_FILE"
if [ ! -f "$LOCAL_ARCHIVE" ]; then
  echo "Error: No se pudo descargar $RESTORE_FILE"
  rm -rf "$RESTORE_DIR"
  exit 1
fi
chmod 600 "$LOCAL_ARCHIVE"

if [ "$CIFRADO" = "si" ]; then
  echo "→ Descifrando..."
  PLANO="${LOCAL_ARCHIVE%.enc}"
  openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE \
    -in "$LOCAL_ARCHIVE" -out "$PLANO" || {
    echo "Error: No se pudo descifrar (¿passphrase incorrecta?)"
    rm -rf "$RESTORE_DIR"
    exit 1
  }
  rm -f "$LOCAL_ARCHIVE"
  LOCAL_ARCHIVE="$PLANO"
  RESTORE_FILE="$(basename "$PLANO")"
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

# Resguardo del estado actual antes de sobreescribir (por si el backup es erróneo).
if [ -f "$DB_FILE" ]; then
  RESGUARDO="/tmp/kendo-pre-restore-$(date +%Y-%m-%d_%H%M%S).db"
  cp "$DB_FILE" "$RESGUARDO"
  chmod 600 "$RESGUARDO"
  echo "  ✓ Estado actual resguardado en $RESGUARDO"
fi

cp "$EXTRACTED_DIR/database.db" "$DB_FILE"
chmod 600 "$DB_FILE"
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
