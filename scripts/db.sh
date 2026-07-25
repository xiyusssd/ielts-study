#!/bin/sh
# Prisma CLI 包装：绕开 pnpm 的 deps 严格检查 + 使用正确的 node。
# 用法：./scripts/db.sh [generate|push|migrate dev|studio|seed]

set -e
NODE_BIN="${NODE_BIN:-/Users/xiyu/.local/node22/bin/node}"
cd "$(dirname "$0")/.."
export PATH="$(dirname $NODE_BIN):/usr/bin:/bin:/opt/homebrew/bin:$PATH"

cmd="$1"; shift || true

case "$cmd" in
  seed)  exec "$NODE_BIN" ./node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs prisma/seed.ts ;;
  *)     exec "$NODE_BIN" ./node_modules/prisma/build/index.js "$cmd" "$@" ;;
esac
