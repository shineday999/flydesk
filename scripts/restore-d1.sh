#!/usr/bin/env bash
#
# Flydesk D1 災難復原：把備份 SQL 匯入本機 D1 並核對筆數。
#
# 用法：
#   scripts/restore-d1.sh                       # 用最新一份備份
#   scripts/restore-d1.sh /path/to/backup.sql   # 指定備份檔
#
# 注意：
#  - 匯入的是「本機」D1（--local），不會動到線上資料。要真正回灌線上必須另外
#    明確指定 --remote 並人工確認。
#  - 專案本身以 cloudflare.config.ts 宣告綁定，wrangler CLI 不讀該格式；
#    本機 D1 需要 scripts/wrangler.d1.jsonc 才能定位 state。
set -euo pipefail

cd "$(dirname "$0")/.."
CONFIG="scripts/wrangler.d1.jsonc"
BACKUP_DIR="${FLYDESK_BACKUP_DIR:-/home/abc/.flydesk-backups}"

if [[ $# -ge 1 ]]; then
  BACKUP="$1"
else
  BACKUP=$(ls -t "$BACKUP_DIR"/d1-*.sql 2>/dev/null | head -1 || true)
fi

if [[ -z "${BACKUP:-}" || ! -f "$BACKUP" ]]; then
  echo "找不到備份檔（目錄：$BACKUP_DIR）。" >&2
  exit 1
fi

echo "備份檔：$BACKUP ($(du -h "$BACKUP" | cut -f1))"

# 每次都匯入到專屬的本機 state 目錄，且先清空，確保結果可重複、與前一次無關。
PERSIST="scripts/.wrangler-d1-restore"
rm -rf "$PERSIST"

echo "→ 匯入本機 D1（state：$PERSIST）"
wrangler d1 execute DB --local --config "$CONFIG" --persist-to "$PERSIST" --file="$BACKUP" >/dev/null

echo "→ 還原後筆數"
wrangler d1 execute DB --local --config "$CONFIG" --persist-to "$PERSIST" \
  --command "SELECT (SELECT COUNT(*) FROM tenants) tenants, (SELECT COUNT(*) FROM orders) orders, (SELECT COUNT(*) FROM audit_log) audit, (SELECT COUNT(*) FROM admin_sessions) sessions" \
  | sed -n '/results/,/]/p'

echo "→ 線上筆數（對照用）"
wrangler d1 execute flydesk --remote \
  --command "SELECT (SELECT COUNT(*) FROM tenants) tenants, (SELECT COUNT(*) FROM orders) orders, (SELECT COUNT(*) FROM audit_log) audit, (SELECT COUNT(*) FROM admin_sessions) sessions" \
  | sed -n '/results/,/]/p'

echo
echo "完成。本機 D1 已可驗證；如需回灌線上，請確認後再執行："
echo "  wrangler d1 execute DB --remote --config $CONFIG --file=$BACKUP"
