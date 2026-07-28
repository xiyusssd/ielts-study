#!/bin/sh
# 打包 Electron 独立窗口版（macOS arm64）
# - Electron 主进程 spawn 内嵌 node22 跑 standalone server.js
# - 与 build-standalone-app.sh（浏览器版）并存，互不影响
# 产物：dist-electron/雅思学习助手-*.dmg
set -e
cd "$(dirname "$0")/.."

NODE_BIN="${NODE_BIN:-/Users/xiyu/.local/node22/bin/node}"
export PATH="$(dirname $NODE_BIN):$PATH"

log() { printf "\033[36m→\033[0m %s\n" "$*"; }
ok()  { printf "\033[32m✓\033[0m %s\n" "$*"; }
err() { printf "\033[31m✗\033[0m %s\n" "$*" >&2; }

[ -x "$NODE_BIN" ] || { err "Node 不存在: $NODE_BIN"; exit 1; }

# 1. standalone build
if [ ! -f .next/standalone/server.js ]; then
  log "构建 Next.js standalone..."
  ./node_modules/.bin/next build
fi
ok "standalone 就位"

mkdir -p build

# 2. 预生成数据库模板 → build/template.db
log "预生成数据库模板..."
TEMPLATE_DB="build/template.db"
rm -f "$TEMPLATE_DB"
ABS_DB="$PWD/$TEMPLATE_DB"

DATABASE_URL="file:$ABS_DB" ./node_modules/.bin/prisma db push --skip-generate --schema=prisma/schema.prisma 2>&1 | tail -3

DATABASE_URL="file:$ABS_DB" "$NODE_BIN" -e "
const { PrismaClient } = require(require.resolve('@prisma/client', { paths: [process.cwd()] }));
const p = new PrismaClient();
p.user.count().then(c => { console.log('  template init:', c, 'users'); return p.\$disconnect(); });
" 2>&1 | tail -2

for s in seed-words seed-words-from-bank seed-passages seed-listening seed-writing seed-speaking seed-real-content; do
  DATABASE_URL="file:$ABS_DB" ./node_modules/.bin/tsx scripts/$s.ts 2>&1 | tail -1
done
DB_SIZE=$(du -h "$TEMPLATE_DB" | awk '{print $1}')
ok "数据库模板 $DB_SIZE"

# 3. 生成 AppIcon.icns → build/icon.icns（复用 build-standalone-app.sh 逻辑）
log "生成图标..."
ICONSET="/tmp/ielts-electron-icon.iconset"
rm -rf "$ICONSET"; mkdir -p "$ICONSET"
if curl -sf http://localhost:3000/apple-icon -o /tmp/apple-icon.png 2>/dev/null; then
  ok "从 :3000 抓取 apple-icon"
elif curl -sf http://localhost:3001/apple-icon -o /tmp/apple-icon.png 2>/dev/null; then
  ok "从 :3001 抓取 apple-icon"
else
  cat > /tmp/icon.svg <<'SVG'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#a855f7"/>
  </linearGradient></defs>
  <rect width="1024" height="1024" rx="230" fill="url(#g)"/>
  <text x="50%" y="50%" font-family="-apple-system,PingFang SC" font-size="640" font-weight="800"
    fill="#fff" text-anchor="middle" dominant-baseline="central">雅</text>
</svg>
SVG
  qlmanage -t -s 1024 -o /tmp /tmp/icon.svg >/dev/null 2>&1 && mv /tmp/icon.svg.png /tmp/apple-icon.png 2>/dev/null || true
fi
if [ -f /tmp/apple-icon.png ]; then
  for size in 16 32 64 128 256 512 1024; do
    sips -z $size $size /tmp/apple-icon.png --out "$ICONSET/icon_${size}x${size}.png" >/dev/null 2>&1
    if [ "$size" -lt 1024 ]; then
      dbl=$((size * 2))
      [ $dbl -le 1024 ] && sips -z $dbl $dbl /tmp/apple-icon.png --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null 2>&1
    fi
  done
  iconutil -c icns "$ICONSET" -o build/icon.icns 2>/dev/null && ok "build/icon.icns 就位"
fi
rm -rf "$ICONSET" /tmp/apple-icon.png /tmp/icon.svg

# 4. electron-builder 打包
log "electron-builder 打包（mac arm64）..."
./node_modules/.bin/electron-builder --mac --arm64 --config electron-builder.yml

ok "打包完成"
echo "   📦 dist-electron/"
ls -lh dist-electron/*.dmg 2>/dev/null | awk '{print "   ", $5, $9}'
