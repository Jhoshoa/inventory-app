#!/bin/sh
# Restaura un backup de backup.sh sobre inventory-db (esquemas public y auth).
# BORRA lo que hay ahora en esos esquemas. Antes, deten la API y Auth:
#
#   docker compose stop api inventory-auth
#   docker compose exec -e CONFIRM=si inventory-db-backup restore.sh /backups/inventory-AAAA-MM-DD_HHMM.dump
#   docker compose start inventory-auth api
#
# Un archivo .dump.enc (copia cifrada de afuera) se descifra con BACKUP_PASSPHRASE.
set -eu

file="${1:?uso: restore.sh /backups/inventory-AAAA-MM-DD_HHMM.dump}"
[ -f "$file" ] || { echo "No existe $file"; exit 1; }
if [ "${CONFIRM:-}" != "si" ]; then
  echo "Esto reemplaza los datos actuales de la base por los de $file."
  echo "Para seguir, repite el comando con CONFIRM=si."
  exit 1
fi

case "$file" in
  *.enc)
    plain="/tmp/restore.dump"
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in "$file" -out "$plain" -pass env:BACKUP_PASSPHRASE
    file="$plain"
    ;;
esac

pg_restore --list "$file" > /dev/null
pg_restore --clean --if-exists --single-transaction --exit-on-error --dbname="${PGDATABASE:-postgres}" "$file"
rm -f /tmp/restore.dump
echo "Restauracion completa desde $1"
