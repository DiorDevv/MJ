#!/usr/bin/env bash
# Dumps the running mj_postgres container's database to backups/mj_db_<timestamp>.sql.gz
#
# Usage: ./scripts/backup-db.sh
# Restore with:                ./scripts/restore-db.sh backups/mj_db_<timestamp>.sql.gz
# Schedule regularly (e.g. a daily cron entry) — postgres_data is a Docker
# volume with no other backup strategy of its own.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"

set -a
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"
set +a

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$BACKUP_DIR/mj_db_${TIMESTAMP}.sql.gz"

docker exec mj_postgres pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT_FILE"
echo "Backup saved to $OUT_FILE"
