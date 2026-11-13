#!/bin/sh
# Backup de la base: los esquemas public (la app) y auth (usuarios de Supabase Auth).
#
#   backup.sh        corre siempre: un backup por dia desde BACKUP_HOUR (hora de TZ),
#                    reintenta cada 10 minutos si falla
#   backup.sh now    un backup ahora y termina
#
# Variables: PGHOST, PGUSER, PGPASSWORD, PGDATABASE (conexion), BACKUP_HOUR (3),
# BACKUP_KEEP_DAYS (14). Copia fuera del servidor (opcional): BACKUP_S3_BUCKET,
# BACKUP_S3_PREFIX, BACKUP_S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
# AWS_DEFAULT_REGION. Con BACKUP_PASSPHRASE la copia de afuera va cifrada (AES-256).
set -eu

BACKUP_DIR=/backups
HOUR="${BACKUP_HOUR:-3}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
PREFIX="${BACKUP_S3_PREFIX:-inventory}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S %Z') backup: $*"; }

run_backup() {
  stamp="$(date +%Y-%m-%d_%H%M)"
  file="$BACKUP_DIR/inventory-$stamp.dump"
  log "inicio -> $file"
  pg_dump --format=custom --compress=6 --schema=public --schema=auth --file="$file.partial"
  # Un archivo que pg_restore no puede leer no es un backup.
  pg_restore --list "$file.partial" > /dev/null
  mv "$file.partial" "$file"
  log "ok ($(du -h "$file" | cut -f1))"

  if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
    upload="$file"
    if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
      upload="$file.enc"
      openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -in "$file" -out "$upload" -pass env:BACKUP_PASSPHRASE
    fi
    endpoint=""
    [ -n "${BACKUP_S3_ENDPOINT:-}" ] && endpoint="--endpoint-url $BACKUP_S3_ENDPOINT"
    # shellcheck disable=SC2086
    aws s3 cp --only-show-errors $endpoint "$upload" "s3://$BACKUP_S3_BUCKET/$PREFIX/$(basename "$upload")"
    [ "$upload" != "$file" ] && rm -f "$upload"
    log "copia subida a s3://$BACKUP_S3_BUCKET/$PREFIX/"
  fi

  find "$BACKUP_DIR" -name 'inventory-*.dump' -mtime +"$KEEP_DAYS" -delete
  rm -f "$BACKUP_DIR"/*.partial
  date > "$BACKUP_DIR/.last-success"
}

mkdir -p "$BACKUP_DIR"

if [ "${1:-}" = "now" ]; then
  run_backup
  exit 0
fi

date > /tmp/started
log "programado a diario desde las ${HOUR}:00 (${TZ:-UTC}), se guardan ${KEEP_DAYS} dias"
while true; do
  today="$(date +%Y-%m-%d)"
  if [ "$(date +%-H)" -ge "$HOUR" ] && ! ls "$BACKUP_DIR"/inventory-"$today"_*.dump > /dev/null 2>&1; then
    run_backup || log "FALLO; se reintenta en 10 minutos"
  fi
  sleep 600
done
