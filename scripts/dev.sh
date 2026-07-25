#!/bin/sh
# 启动开发服务器。
# 必须用 nodejs.org 官方 Node（带 disable-library-validation entitlement）；
# 默认 /Users/xiyu/.local/node22/bin/node — 系统里那个是 ChatGPT.app 附带的 hardened Node，
# 无法加载 npm 生态的 ad-hoc 签名 .node 模块（macOS Sequoia Library Validation）。

set -e
NODE_BIN="${NODE_BIN:-/Users/xiyu/.local/node22/bin/node}"

if [ ! -x "$NODE_BIN" ]; then
  echo "❌ 找不到 $NODE_BIN"
  echo "   请从 https://cdn.npmmirror.com/binaries/node/v22.14.0/node-v22.14.0-darwin-arm64.tar.xz 下载并解压到 ~/.local/node22/"
  exit 1
fi

cd "$(dirname "$0")/.."
export PATH="$(dirname $NODE_BIN):/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "→ node: $($NODE_BIN -v)"
echo "→ 启动 Next.js dev server on http://localhost:3000"
exec "$NODE_BIN" ./node_modules/next/dist/bin/next dev
