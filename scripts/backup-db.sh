#!/usr/bin/env bash
# Dumps the running mj_postgres container's database to backups/mj_db_<timestamp>.sql.gz
# and prunes old backups beyond BACKUP_KEEP_COUNT (default 14 — roughly two weeks
# of daily backups; cheap insurance since each dump is a few KB-MB of gzipped SQL).
#
# Usage: ./scripts/backup-db.sh
# Restore with:                ./scripts/restore-db.sh backups/mj_db_<timestamp>.sql.gz
# Scheduled via cron (see scripts/install-backup-cron.sh) to run daily —
# postgres_data is a Docker volume with no other backup strategy of its own.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
KEEP_COUNT="${BACKUP_KEEP_COUNT:-14}"
mkdir -p "$BACKUP_DIR"

set -a
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"
set +a

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$BACKUP_DIR/mj_db_${TIMESTAMP}.sql.gz"

docker exec mj_postgres pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT_FILE"
echo "Backup saved to $OUT_FILE"

# Prune: keep only the newest KEEP_COUNT backups.
mapfile -t old_backups < <(ls -1t "$BACKUP_DIR"/mj_db_*.sql.gz 2>/dev/null | tail -n "+$((KEEP_COUNT + 1))")
if [ "${#old_backups[@]}" -gt 0 ]; then
  rm -f "${old_backups[@]}"
  echo "Pruned ${#old_backups[@]} old backup(s), keeping newest $KEEP_COUNT"
fi
