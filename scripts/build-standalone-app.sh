#!/bin/sh
# 打包完全独立的 macOS .app（rednote 风格）
# - 内嵌 Node.js 22 二进制
# - 内嵌 Next.js standalone build（含 node_modules、Prisma client、engines）
# - 内嵌预生成的数据库模板（含 schema + seed 数据）
# - 双击即启动 Node server + 打开浏览器
# - 数据保存在 ~/Library/Application Support/雅思学习助手/
#
# 用法：./scripts/build-standalone-app.sh
# 产物：dist/雅思学习助手.app

set -e
cd "$(dirname "$0")/.."

APP_NAME="雅思学习助手"
BUNDLE_ID="app.ielts.study"
APP_DIR="dist/$APP_NAME.app"
NODE_BIN="${NODE_BIN:-/Users/xiyu/.local/node22/bin/node}"

log() { printf "\033[36m→\033[0m %s\n" "$*"; }
ok()  { printf "\033[32m✓\033[0m %s\n" "$*"; }
err() { printf "\033[31m✗\033[0m %s\n" "$*" >&2; }

[ -x "$NODE_BIN" ] || { err "Node 不存在: $NODE_BIN"; exit 1; }

# 1. 确保 standalone 已 build
if [ ! -f .next/standalone/server.js ]; then
  log "构建 Next.js standalone..."
  export PATH="$(dirname $NODE_BIN):$PATH"
  ./node_modules/.bin/next build
fi

log "清理旧 .app..."
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources/app"

# 2. Info.plist
cat > "$APP_DIR/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$APP_NAME</string>
  <key>CFBundleDisplayName</key><string>$APP_NAME</string>
  <key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
  <key>CFBundleVersion</key><string>1.0.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.education</string>
  <key>NSHumanReadableCopyright</key><string>雅思学习助手 · 完全本地部署</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

# 3. 生成 AppIcon.icns
log "生成图标..."
ICONSET="/tmp/ielts-app-icon.iconset"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

# 优先从运行的服务器抓
if curl -sf http://localhost:3000/apple-icon -o /tmp/apple-icon.png 2>/dev/null; then
  ok "从 :3000 抓取 apple-icon"
elif curl -sf http://localhost:3001/apple-icon -o /tmp/apple-icon.png 2>/dev/null; then
  ok "从 :3001 抓取 apple-icon"
else
  log "服务器未运行 · 用 SVG fallback 生成"
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
  iconutil -c icns "$ICONSET" -o "$APP_DIR/Contents/Resources/AppIcon.icns" 2>/dev/null
  ok "AppIcon.icns 就位"
fi
rm -rf "$ICONSET" /tmp/apple-icon.png /tmp/icon.svg

# 4. Node runtime
log "复制 Node runtime..."
cp "$NODE_BIN" "$APP_DIR/Contents/Resources/node"
chmod +x "$APP_DIR/Contents/Resources/node"

# 5. Next.js standalone build（含 node_modules）
log "复制 Next.js standalone..."
cp -R .next/standalone/. "$APP_DIR/Contents/Resources/app/"
[ -d public ] && cp -R public "$APP_DIR/Contents/Resources/app/public"
mkdir -p "$APP_DIR/Contents/Resources/app/.next"
cp -R .next/static "$APP_DIR/Contents/Resources/app/.next/static"

# 6. Prisma schema
cp -R prisma "$APP_DIR/Contents/Resources/app/prisma"

# 7. 预生成数据库模板（含 schema + seed 全部）
log "预生成数据库模板..."
export PATH="$(dirname $NODE_BIN):$PATH"
TEMPLATE_DB="/tmp/ielts-template-$$.db"
rm -f "$TEMPLATE_DB"

# 用主项目的 prisma CLI 生成 schema
DATABASE_URL="file:$TEMPLATE_DB" ./node_modules/.bin/prisma db push --skip-generate --schema=prisma/schema.prisma 2>&1 | tail -3

# schema 健全性检查（动态定位 prisma client，避免硬编码 pnpm 版本路径）
DATABASE_URL="file:$TEMPLATE_DB" "$NODE_BIN" -e "
const { PrismaClient } = require(require.resolve('@prisma/client', { paths: [process.cwd()] }));
const p = new PrismaClient();
p.user.count().then(c => { console.log('  template init:', c, 'users'); return p.\$disconnect(); });
" 2>&1 | tail -2

# 用 tsx 跑真实 seed 脚本填充模板
DATABASE_URL="file:$TEMPLATE_DB" ./node_modules/.bin/tsx scripts/seed-words.ts 2>&1 | tail -2
# 从 vocab-bank 灌满复习库(5031 词 + 三维分类 tags)
DATABASE_URL="file:$TEMPLATE_DB" ./node_modules/.bin/tsx scripts/seed-words-from-bank.ts 2>&1 | tail -2
DATABASE_URL="file:$TEMPLATE_DB" ./node_modules/.bin/tsx scripts/seed-passages.ts 2>&1 | tail -2
DATABASE_URL="file:$TEMPLATE_DB" ./node_modules/.bin/tsx scripts/seed-listening.ts 2>&1 | tail -2
DATABASE_URL="file:$TEMPLATE_DB" ./node_modules/.bin/tsx scripts/seed-writing.ts 2>&1 | tail -2
DATABASE_URL="file:$TEMPLATE_DB" ./node_modules/.bin/tsx scripts/seed-speaking.ts 2>&1 | tail -2
# 剑桥真题 + VOA 真实内容(阅读/听力 study 模块)
DATABASE_URL="file:$TEMPLATE_DB" ./node_modules/.bin/tsx scripts/seed-real-content.ts 2>&1 | tail -2

# 复制模板到 .app
cp "$TEMPLATE_DB" "$APP_DIR/Contents/Resources/template.db"
DB_SIZE=$(du -h "$TEMPLATE_DB" | awk '{print $1}')
rm -f "$TEMPLATE_DB"
ok "数据库模板 $DB_SIZE"

# 8. Launcher
cat > "$APP_DIR/Contents/MacOS/launcher" <<'LAUNCHER'
#!/bin/sh
DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"
NODE="$DIR/node"
APP_DIR="$DIR/app"

DATA_DIR="$HOME/Library/Application Support/雅思学习助手"
mkdir -p "$DATA_DIR"

LOG="$DATA_DIR/launcher.log"
exec >> "$LOG" 2>&1
echo "----------------------------------------"
echo "[$(date)] 启动"
echo "----------------------------------------"

# 首次运行：从模板拷贝数据库
if [ ! -f "$DATA_DIR/data.db" ]; then
  osascript -e 'display notification "首次启动，初始化中..." with title "雅思学习助手"' 2>/dev/null
  cp "$DIR/template.db" "$DATA_DIR/data.db"
  echo "[$(date)] 数据库从模板初始化"
else
  # 内容同步：template 的题库/词库有更新时，刷新内容表，保留账号/评估/计划。
  # 用"内容指纹"（各内容表行数）判断是否需要同步；相同则跳过。
  # 注意：内容表主键是 cuid，重灌后 id 会变，故一并清理强依赖内容 id 的进度记录
  #       (VocabProgress/Attempt/WritingSubmission/SpeakingSession)，避免悬空引用。
  #       账号(User/Profile)、评估(Assessment)、计划(Plan/WeekPlan/DailyTask) 保留。
  SQLITE=/usr/bin/sqlite3
  FP_SQL="SELECT (SELECT count(*) FROM Word)||'_'||(SELECT count(*) FROM Passage)||'_'||(SELECT count(*) FROM Question)||'_'||(SELECT count(*) FROM WritingPrompt)||'_'||(SELECT count(*) FROM SpeakingPrompt);"
  TPL_FP=$("$SQLITE" "$DIR/template.db" "$FP_SQL" 2>/dev/null)
  DATA_FP=$("$SQLITE" "$DATA_DIR/data.db" "$FP_SQL" 2>/dev/null)
  if [ -n "$TPL_FP" ] && [ "$TPL_FP" != "$DATA_FP" ]; then
    echo "[$(date)] 内容有更新（$DATA_FP → $TPL_FP），同步题库/词库..."
    cp "$DATA_DIR/data.db" "$DATA_DIR/data.db.bak"
    "$SQLITE" "$DATA_DIR/data.db" <<SYNC
PRAGMA foreign_keys=OFF;
ATTACH '$DIR/template.db' AS tpl;
BEGIN;
DELETE FROM VocabProgress;
DELETE FROM Attempt;
DELETE FROM WritingSubmission;
DELETE FROM SpeakingSession;
DELETE FROM Question;
DELETE FROM Passage;
DELETE FROM Word;
DELETE FROM WritingPrompt;
DELETE FROM SpeakingPrompt;
INSERT INTO Word SELECT * FROM tpl.Word;
INSERT INTO Passage SELECT * FROM tpl.Passage;
INSERT INTO Question SELECT * FROM tpl.Question;
INSERT INTO WritingPrompt SELECT * FROM tpl.WritingPrompt;
INSERT INTO SpeakingPrompt SELECT * FROM tpl.SpeakingPrompt;
COMMIT;
DETACH tpl;
SYNC
    if [ $? -eq 0 ]; then
      echo "[$(date)] 内容同步完成（备份 data.db.bak）"
    else
      echo "[$(date)] 内容同步失败，回滚"
      cp "$DATA_DIR/data.db.bak" "$DATA_DIR/data.db"
    fi
  fi

  # schema 升级：补齐用户表新增的可空列（ADD COLUMN 安全幂等）。
  # 内容同步只重灌内容表，不改用户表结构；新版加的列要在这里补，否则老 data.db 缺列会崩。
  # 加列方式：SELECT 探测列是否存在，不存在才 ALTER。以后 schema 加列就在此加一行。
  add_col() { # $1=表 $2=列 $3=列定义
    "$SQLITE" "$DATA_DIR/data.db" "SELECT $2 FROM $1 LIMIT 1;" >/dev/null 2>&1 || {
      "$SQLITE" "$DATA_DIR/data.db" "ALTER TABLE $1 ADD COLUMN $3;" 2>/dev/null \
        && echo "[$(date)] schema 补列 $1.$2"
    }
  }
  add_col Profile dailyNewWords "dailyNewWords INTEGER"
  add_col Profile dailyReviewWords "dailyReviewWords INTEGER"
fi

# 找空闲端口
PORT=3000
while lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
  [ "$PORT" -gt 3020 ] && { osascript -e 'display alert "端口 3000-3020 被占" as critical'; exit 1; }
done
echo "  PORT: $PORT"

# 环境变量
export DATABASE_URL="file:$DATA_DIR/data.db"
if [ ! -f "$DATA_DIR/session-secret" ]; then
  openssl rand -base64 48 | tr -d '\n' > "$DATA_DIR/session-secret"
fi
export SESSION_SECRET=$(cat "$DATA_DIR/session-secret")
export PORT
export HOSTNAME=127.0.0.1
export NODE_ENV=production
export NEXT_PUBLIC_APP_URL="http://127.0.0.1:$PORT"
export NEXT_TELEMETRY_DISABLED=1
export AI_TEXT_PROVIDER=openai
export AI_VOICE_PROVIDER=openai
export AI_STT_PROVIDER=openai
export AI_REALTIME_PROVIDER=openai
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_TEXT_MODEL="gpt-4o"
export OPENAI_TTS_MODEL="tts-1"
export OPENAI_STT_MODEL="whisper-1"
export OPENAI_REALTIME_MODEL="gpt-4o-realtime-preview"
export ANTHROPIC_TEXT_MODEL="claude-sonnet-4-6"
export OLLAMA_BASE_URL="http://localhost:11434"
export OLLAMA_TEXT_MODEL="qwen2.5:7b"
# 用户 .env 覆盖（填 API key 用）
[ -f "$DATA_DIR/.env" ] && . "$DATA_DIR/.env"

cd "$APP_DIR"

echo "[$(date)] 启动 Next.js server"
"$NODE" server.js &
SERVER_PID=$!

# 等 ready
for i in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && break
  sleep 1
done
echo "[$(date)] ready, 打开浏览器"

open "http://127.0.0.1:$PORT"

trap "kill $SERVER_PID 2>/dev/null; exit 0" TERM INT
wait $SERVER_PID
LAUNCHER
chmod +x "$APP_DIR/Contents/MacOS/launcher"

# 大小
SIZE=$(du -sh "$APP_DIR" | awk '{print $1}')
ok "打包完成 · $SIZE"
echo ""
echo "   📦 $APP_DIR"
echo "   测试：open \"$APP_DIR\""
