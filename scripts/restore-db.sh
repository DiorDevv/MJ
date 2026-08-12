#!/usr/bin/env bash
# Restores a backup produced by scripts/backup-db.sh, REPLACING all current data.
#
# Usage: ./scripts/restore-db.sh backups/mj_db_20260101_120000.sql.gz
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  exit 1
fi
BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "No such file: $BACKUP_FILE" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a
# shellcheck disable=SC1091
source "$ROOT_DIR/.env"
set +a

echo "This will REPLACE all data in database '$POSTGRES_DB'. Press Enter to continue, or Ctrl+C to abort."
read -r _

gunzip -c "$BACKUP_FILE" | docker exec -i mj_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "Restore complete."
