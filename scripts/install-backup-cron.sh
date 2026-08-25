#!/usr/bin/env bash
# Installs a daily cron job that runs scripts/backup-db.sh at 03:00 (system/TZ
# local time). Safe to re-run — replaces any previous entry for this script
# instead of duplicating it.
#
# Usage: ./scripts/install-backup-cron.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="$ROOT_DIR/scripts/backup-db.sh"
LOG_FILE="$ROOT_DIR/backups/backup.log"
MARKER="# mj-backup-cron"
CRON_LINE="0 3 * * * $BACKUP_SCRIPT >> $LOG_FILE 2>&1 $MARKER"

mkdir -p "$ROOT_DIR/backups"

existing="$(crontab -l 2>/dev/null || true)"
filtered="$(printf '%s\n' "$existing" | grep -vF "$MARKER" || true)"
printf '%s\n%s\n' "$filtered" "$CRON_LINE" | sed '/^$/d' | crontab -

echo "Installed daily backup cron job (03:00): $CRON_LINE"
echo "Logs: $LOG_FILE"
crontab -l
