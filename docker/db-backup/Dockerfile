# Backup diario de inventory-db (ver backup.sh) y restauracion (restore.sh).
# El cliente de Postgres debe ser de la misma version mayor que el servidor (17).
FROM postgres:17-alpine
RUN apk add --no-cache aws-cli openssl tzdata
COPY backup.sh restore.sh /usr/local/bin/
RUN chmod 0755 /usr/local/bin/backup.sh /usr/local/bin/restore.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
