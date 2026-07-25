#!/bin/sh
# 一键启动器
# 用法：
#   ./start.sh         → 自动选（有 OrbStack/Docker 则 docker，否则本地 dev）
#   ./start.sh local   → 本地 Node dev server
#   ./start.sh docker  → Docker 容器（Dockerized SQLite）
#   ./start.sh stop    → 停 docker 容器
#   ./start.sh logs    → 看 docker 日志
#   ./start.sh reset   → 停并清空数据卷（危险！）

set -e
cd "$(dirname "$0")"

MODE="${1:-auto}"
PROJECT="${IELTS_PROJECT:-ielts}"
NODE_BIN="${NODE_BIN:-/Users/xiyu/.local/node22/bin/node}"
ORB="/Applications/OrbStack.app"

log() { printf "\033[36m→\033[0m %s\n" "$*"; }
ok()  { printf "\033[32m✓\033[0m %s\n" "$*"; }
warn(){ printf "\033[33m!\033[0m %s\n" "$*"; }
err() { printf "\033[31m✗\033[0m %s\n" "$*" >&2; }

ensure_env() {
  if [ ! -f .env ]; then
    log "首次运行，从 .env.example 生成 .env"
    cp .env.example .env
    SECRET=$(openssl rand -base64 48 | tr -d '\n' | head -c 64)
    if command -v gsed >/dev/null; then
      gsed -i "s|SESSION_SECRET=.*|SESSION_SECRET=\"$SECRET\"|" .env
    else
      sed -i "" "s|SESSION_SECRET=.*|SESSION_SECRET=\"$SECRET\"|" .env
    fi
    warn ".env 已生成。若要用 AI 功能，编辑 .env 填 OPENAI_API_KEY"
  fi
}

start_local() {
  log "本地模式（Node.js dev server）"
  ensure_env

  if [ ! -x "$NODE_BIN" ]; then
    err "找不到 $NODE_BIN"
    echo "  请从 https://cdn.npmmirror.com/binaries/node/v22.14.0/node-v22.14.0-darwin-arm64.tar.xz"
    echo "  下载并解压到 ~/.local/node22/"
    exit 1
  fi

  if [ ! -d node_modules ]; then
    log "首次安装依赖 (pnpm install)..."
    pnpm install --fetch-timeout 300000
    ok "依赖装好"
  fi

  if [ ! -f prisma/dev.db ]; then
    log "初始化数据库..."
    "$NODE_BIN" ./node_modules/prisma/build/index.js db push --skip-generate
    log "导入 seed 数据..."
    "$NODE_BIN" ./node_modules/.bin/tsx prisma/seed.ts
    "$NODE_BIN" ./node_modules/.bin/tsx scripts/seed-words.ts
    "$NODE_BIN" ./node_modules/.bin/tsx scripts/seed-passages.ts
    "$NODE_BIN" ./node_modules/.bin/tsx scripts/seed-listening.ts
    "$NODE_BIN" ./node_modules/.bin/tsx scripts/seed-writing.ts
    "$NODE_BIN" ./node_modules/.bin/tsx scripts/seed-speaking.ts
    ok "数据库就绪（3 段 seed 完成）"
  fi

  ok "启动开发服务器"
  echo ""
  echo "   访问 http://localhost:3000"
  echo "   按 Ctrl+C 停止"
  echo ""
  export PATH="$(dirname $NODE_BIN):$PATH"
  exec "$NODE_BIN" ./node_modules/next/dist/bin/next dev
}

check_orbstack() {
  if [ -d "$ORB" ]; then
    if ! docker version 2>&1 | grep -q "Server:"; then
      log "启动 OrbStack..."
      open -a OrbStack
      for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
        if docker version 2>&1 | grep -q "Server:"; then break; fi
        sleep 1
      done
    fi
  fi
  if ! docker version 2>&1 | grep -q "Server:"; then
    err "Docker 未启动 · 请打开 OrbStack 或 Docker Desktop"
    exit 1
  fi
}

start_docker() {
  log "Docker 模式（SQLite + 生产 build）"
  ensure_env
  check_orbstack

  log "构建镜像..."
  docker compose -p "$PROJECT" build 2>&1 | tail -3

  log "启动容器..."
  docker compose -p "$PROJECT" up -d 2>&1 | tail -3
  sleep 3

  log "初始化数据库 schema..."
  docker compose -p "$PROJECT" exec -T app ./node_modules/.bin/prisma db push --skip-generate 2>&1 | tail -3

  # 检测是否已 seed
  COUNT=$(docker compose -p "$PROJECT" exec -T app node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.word.count().then(c => { console.log(c); return p.\$disconnect(); }).catch(() => { console.log(0); });
  " 2>/dev/null | tail -1 | tr -d '\r\n')

  if [ "${COUNT:-0}" -lt 10 ]; then
    log "首次运行，导入 seed 数据..."
    docker compose -p "$PROJECT" exec -T app ./node_modules/.bin/tsx prisma/seed.ts >/dev/null 2>&1
    docker compose -p "$PROJECT" exec -T app ./node_modules/.bin/tsx scripts/seed-words.ts >/dev/null 2>&1
    docker compose -p "$PROJECT" exec -T app ./node_modules/.bin/tsx scripts/seed-passages.ts >/dev/null 2>&1
    docker compose -p "$PROJECT" exec -T app ./node_modules/.bin/tsx scripts/seed-listening.ts >/dev/null 2>&1
    docker compose -p "$PROJECT" exec -T app ./node_modules/.bin/tsx scripts/seed-writing.ts >/dev/null 2>&1
    docker compose -p "$PROJECT" exec -T app ./node_modules/.bin/tsx scripts/seed-speaking.ts >/dev/null 2>&1
    log "重启 app 载入 Prisma 新 schema..."
    docker compose -p "$PROJECT" restart app 2>&1 | tail -1
    sleep 3
    ok "数据导入完成"
  else
    ok "数据库已就绪（${COUNT} 词）"
  fi

  echo ""
  ok "启动完成"
  echo ""
  echo "   访问 http://localhost:3000"
  if [ -d "$ORB" ]; then
    echo "   OrbStack 域名：http://ielts-app-1.$PROJECT.orb.local"
  fi
  echo ""
  echo "   日志：./start.sh logs"
  echo "   停止：./start.sh stop"
  echo ""
}

stop_docker() {
  log "停止容器..."
  docker compose -p "$PROJECT" down
  ok "已停止（数据卷保留）"
}

reset_docker() {
  warn "这将删除所有 Docker 数据（用户 / 学习记录）"
  printf "确定？(y/N) "
  read -r confirm
  if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    docker compose -p "$PROJECT" down -v
    ok "已重置"
  else
    log "取消"
  fi
}

show_logs() {
  docker compose -p "$PROJECT" logs -f app
}

case "$MODE" in
  local)  start_local ;;
  docker) start_docker ;;
  stop)   stop_docker ;;
  reset)  reset_docker ;;
  logs)   show_logs ;;
  auto)
    if [ -d "$ORB" ] || docker version 2>&1 | grep -q "Server:"; then
      start_docker
    else
      start_local
    fi
    ;;
  *)
    echo "用法: $0 [local|docker|stop|logs|reset]"
    exit 1
    ;;
esac
