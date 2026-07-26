#!/bin/sh
# 打包 macOS .dmg 安装镜像
# 用法：./scripts/build-dmg.sh
# 产物：dist/雅思学习助手-1.0.0.dmg
#
# 双击 .dmg → 显示 .app 图标和 Applications 快捷方式 → 拖过去即安装

set -e
cd "$(dirname "$0")/.."

APP_NAME="雅思学习助手"
VERSION="1.0.0"
APP_DIR="dist/$APP_NAME.app"
STAGE_DIR="dist/dmg-stage"
DMG_PATH="dist/$APP_NAME-$VERSION.dmg"

log() { printf "\033[36m→\033[0m %s\n" "$*"; }
ok()  { printf "\033[32m✓\033[0m %s\n" "$*"; }

# 确保 .app 存在
if [ ! -d "$APP_DIR" ]; then
  log ".app 不存在，先构建"
  ./scripts/build-standalone-app.sh
fi

# 清理旧的
rm -rf "$STAGE_DIR" "$DMG_PATH"
mkdir -p "$STAGE_DIR"

# 复制 .app 到 stage 目录
log "复制 $APP_NAME.app..."
cp -R "$APP_DIR" "$STAGE_DIR/"

# 创建 Applications 快捷方式（用户拖 .app 到这里即完成安装）
log "创建 Applications 快捷方式..."
ln -s /Applications "$STAGE_DIR/Applications"

# 创建 .dmg（大小自动根据源目录计算）
log "打包 .dmg..."
hdiutil create -srcfolder "$STAGE_DIR" \
  -volname "$APP_NAME" \
  -fs HFS+ \
  -fsargs "-c c=64,a=16,e=16" \
  -format UDZO \
  -imagekey zlib-level=9 \
  "$DMG_PATH" 2>&1 | tail -3

# 清理
rm -rf "$STAGE_DIR"

SIZE=$(du -h "$DMG_PATH" | awk '{print $1}')
ok "打包完成"
echo ""
echo "   📦 $DMG_PATH ($SIZE)"
echo ""
echo "   打开测试：open \"$DMG_PATH\""
echo "   直接分发这个 .dmg 文件 · 用户双击 → 拖到 Applications 即安装"
echo ""
echo "   ⚠️  未做代码签名，用户首次打开会提示"未验证的开发者"，"
echo "      需要右键 → 打开（或系统设置 → 隐私与安全 → 允许打开）"
