#!/bin/sh
# 数据备份脚本：本地 SQLite + content 目录 → 打包 tar.gz
# 用法：./scripts/backup.sh [output-dir]
# Docker 版会自动跑 pg_dump 而不是复制 SQLite 文件。

set -e
cd "$(dirname "$0")/.."

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

TS=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="ielts-backup-${TS}"
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

echo "→ 备份到 $OUT_DIR/${BACKUP_NAME}.tar.gz"

# 1. 数据库
if [ -f prisma/dev.db ]; then
  echo "  · 复制 SQLite dev.db"
  cp prisma/dev.db "$TMP/dev.db"
elif [ -n "${DATABASE_URL:-}" ] && echo "$DATABASE_URL" | grep -q "postgres"; then
  echo "  · pg_dump（需要本机装 pg_dump）"
  pg_dump "$DATABASE_URL" > "$TMP/db.sql" || {
    echo "  ⚠️ pg_dump 失败，跳过 DB 备份"
  }
else
  echo "  ⚠️ 未找到 dev.db，跳过数据库"
fi

# 2. 用户内容（词表、解析产物、音频；PDF 不备份，让用户自留）
if [ -d content ]; then
  echo "  · 复制 content/（不含 cambridge-pdfs）"
  mkdir -p "$TMP/content"
  for d in wordlists parsed audio; do
    [ -d "content/$d" ] && cp -R "content/$d" "$TMP/content/" || true
  done
fi

# 3. .env（隐去 API keys？由用户自己 review 后决定）
if [ -f .env ]; then
  echo "  · 复制 .env（含 API keys，务必妥善保管备份文件）"
  cp .env "$TMP/env.txt"
fi

# 打包
tar -czf "$OUT_DIR/${BACKUP_NAME}.tar.gz" -C "$TMP" .
size=$(ls -lh "$OUT_DIR/${BACKUP_NAME}.tar.gz" | awk '{print $5}')
echo "✅ 备份完成 · $size"
echo "   $OUT_DIR/${BACKUP_NAME}.tar.gz"
