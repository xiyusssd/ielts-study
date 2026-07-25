#!/bin/sh
# 打包一个 macOS .app 应用，双击即启动 Docker + 打开浏览器
# 用法：./scripts/build-macos-app.sh [output-dir]
# 产物：<output>/雅思学习助手.app （拖到 /Applications 即可）

set -e
cd "$(dirname "$0")/.."

OUT_DIR="${1:-./dist}"
APP_NAME="雅思学习助手"
BUNDLE_ID="app.ielts.study"
APP_DIR="$OUT_DIR/$APP_NAME.app"

log() { printf "\033[36m→\033[0m %s\n" "$*"; }
ok()  { printf "\033[32m✓\033[0m %s\n" "$*"; }

log "构建 macOS .app bundle → $APP_DIR"

# 清理旧
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# --- Info.plist ---
cat > "$APP_DIR/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>$APP_NAME</string>
  <key>CFBundleDisplayName</key>
  <string>$APP_NAME</string>
  <key>CFBundleIdentifier</key>
  <string>$BUNDLE_ID</string>
  <key>CFBundleVersion</key>
  <string>1.0.0</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleExecutable</key>
  <string>launcher</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>LSApplicationCategoryType</key>
  <string>public.app-category.education</string>
  <key>NSHumanReadableCopyright</key>
  <string>雅思学习助手 · 本地 AI 备考平台</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

# --- 生成 AppIcon.icns ---
log "生成应用图标..."
ICONSET="/tmp/ielts-app-icon.iconset"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

# 优先用运行中的容器（http://localhost:3000/apple-icon 是 180x180）
# 也接受用户已经运行本地 dev
if curl -sf http://localhost:3000/apple-icon -o /tmp/apple-icon.png 2>/dev/null; then
  ok "从运行的服务器抓取 apple-icon"
else
  # fallback：用 svg 生成
  cat > /tmp/icon.svg <<'SVG'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="230" fill="url(#g)"/>
  <text x="50%" y="50%" font-family="-apple-system, PingFang SC, sans-serif" font-size="640"
    font-weight="800" fill="#fff" text-anchor="middle" dominant-baseline="central">雅</text>
</svg>
SVG
  # 用 sips 或 qlmanage 转 PNG（不需要装 imagemagick）
  if command -v qlmanage >/dev/null; then
    qlmanage -t -s 1024 -o /tmp /tmp/icon.svg >/dev/null 2>&1
    mv /tmp/icon.svg.png /tmp/apple-icon.png 2>/dev/null || true
  fi
  # 如果失败，尝试用 rsvg-convert
  if [ ! -f /tmp/apple-icon.png ] && command -v rsvg-convert >/dev/null; then
    rsvg-convert -w 1024 -h 1024 /tmp/icon.svg -o /tmp/apple-icon.png
  fi
  # 最后 fallback：不生成图标（仍能运行）
  if [ ! -f /tmp/apple-icon.png ]; then
    log "无法生成图标（缺 sips/rsvg-convert 且服务器未运行）· .app 将使用默认图标"
  else
    ok "生成 SVG → PNG 图标"
  fi
fi

if [ -f /tmp/apple-icon.png ]; then
  for size in 16 32 64 128 256 512 1024; do
    sips -z $size $size /tmp/apple-icon.png --out "$ICONSET/icon_${size}x${size}.png" >/dev/null 2>&1
    # retina 2x（除了 1024）
    if [ "$size" -lt 1024 ]; then
      dbl=$((size * 2))
      if [ $dbl -le 1024 ]; then
        sips -z $dbl $dbl /tmp/apple-icon.png --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null 2>&1
      fi
    fi
  done
  iconutil -c icns "$ICONSET" -o "$APP_DIR/Contents/Resources/AppIcon.icns" 2>/dev/null
  ok "AppIcon.icns 打包完成"
fi
rm -rf "$ICONSET" /tmp/apple-icon.png /tmp/icon.svg

# --- launcher 脚本（.app 双击执行的入口） ---
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cat > "$APP_DIR/Contents/MacOS/launcher" <<LAUNCHER
#!/bin/sh
# 雅思学习助手 · macOS launcher
# 双击 .app → 启动 Docker/OrbStack → 启动容器 → 打开浏览器

PROJECT="$PROJECT_DIR"
LOG=/tmp/ielts-launcher.log
exec > "\$LOG" 2>&1

echo "[\$(date)] 启动器开始"

# 打开 OrbStack（如果没开）
if [ -d "/Applications/OrbStack.app" ]; then
  if ! /usr/local/bin/docker version 2>&1 | grep -q "Server:"; then
    open -a OrbStack
    for i in \$(seq 1 30); do
      /usr/local/bin/docker version 2>&1 | grep -q "Server:" && break
      sleep 1
    done
  fi
fi

# 如果 Docker 都不可用，弹提示 + 退出
if ! /usr/local/bin/docker version 2>&1 | grep -q "Server:"; then
  osascript -e 'display alert "无法启动 Docker" message "请先安装并打开 OrbStack (推荐) 或 Docker Desktop" as critical'
  exit 1
fi

cd "\$PROJECT"

# 启动容器（若未启）
if ! /usr/local/bin/docker compose -p ielts ps 2>&1 | grep -q "Up"; then
  osascript -e 'display notification "首次启动可能需要 30-60 秒" with title "雅思学习助手"'
  /usr/local/bin/docker compose -p ielts up -d
fi

# 等 app 就绪
for i in \$(seq 1 30); do
  curl -sf http://localhost:3000/api/health >/dev/null 2>&1 && break
  sleep 1
done

# 打开浏览器
open "http://localhost:3000"

echo "[\$(date)] 启动完成"
LAUNCHER
chmod +x "$APP_DIR/Contents/MacOS/launcher"

ok "打包完成：$APP_DIR"
echo ""
echo "   双击运行：open \"$APP_DIR\""
echo "   拖到 Applications：cp -R \"$APP_DIR\" /Applications/"
echo "   日志：tail -f /tmp/ielts-launcher.log"
