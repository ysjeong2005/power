#!/bin/bash
set -euo pipefail

BACKUP_DIR="/home/ec2-user/db-backups"
DATE="$(date +%F)"

mkdir -p "$BACKUP_DIR"

mysqldump -u appuser -p"${DB_PASSWORD}" personal_project | gzip > "$BACKUP_DIR/personal_project_${DATE}.sql.gz"
find "$BACKUP_DIR" -type f -mtime +7 -delete
