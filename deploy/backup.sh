#!/bin/sh
# Dumps the database every day to /backups (mounted from ./backups) and
# deletes dumps older than BACKUP_KEEP_DAYS days. A first dump is made at start.
set -u
KEEP="${BACKUP_KEEP_DAYS:-30}"
mkdir -p /backups
while true; do
  FILE="/backups/diagnostic-$(date +%Y-%m-%d_%H%M).sql.gz"
  if pg_dump --no-owner --clean --if-exists | gzip > "$FILE.tmp"; then
    mv "$FILE.tmp" "$FILE"
    echo "$(date -Iseconds) backup written: $FILE"
  else
    rm -f "$FILE.tmp"
    echo "$(date -Iseconds) backup FAILED" >&2
  fi
  find /backups -name 'diagnostic-*.sql.gz' -mtime +"$KEEP" -delete
  sleep 86400
done
