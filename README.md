# 雅思学习助手

AI 驱动的 IELTS 备考平台：5 维水平测试 → 个性化学习计划 → 5 大模块 (词汇 · 阅读 · 听力 · 写作 · 口语) 闭环训练。

## 快速开始

### 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量并填入 API Key
cp .env.example .env
# 编辑 .env，至少填 OPENAI_API_KEY 和 SESSION_SECRET
# 生成一个 SESSION_SECRET: openssl rand -base64 48

# 3. 初始化数据库
pnpm db:push
pnpm db:seed

# 4. 启动
pnpm dev
```

访问 http://localhost:3000

### Docker（OrbStack）

**首次部署**：

```bash
# 1. 确保 OrbStack 已启动（Applications/OrbStack.app）
open -a OrbStack

# 2. 准备生产环境变量
cp .env.example .env
# 编辑 .env — 至少设置 OPENAI_API_KEY 和 SESSION_SECRET

# 3. 一键起 app + postgres
docker compose up -d --build

# 4. 初始化数据库
docker compose exec app ./node_modules/.bin/prisma db push --skip-generate
docker compose exec app ./node_modules/.bin/tsx scripts/seed-words.ts
docker compose exec app ./node_modules/.bin/tsx scripts/seed-passages.ts
docker compose exec app ./node_modules/.bin/tsx scripts/seed-listening.ts
docker compose exec app ./node_modules/.bin/tsx scripts/seed-writing.ts
docker compose exec app ./node_modules/.bin/tsx scripts/seed-speaking.ts

# 5. 访问
open http://localhost:3000
# 或 OrbStack 域名：open http://ielts.orb.local
```

**日常操作**：

```bash
docker compose logs -f app          # 看日志
docker compose exec app sh          # 进容器 shell
docker compose restart app          # 重启
docker compose down                 # 停（保留数据卷）
docker compose down -v              # 停并清空数据（危险）
./scripts/backup.sh                 # 备份数据到 ./backups/
```

**OrbStack 特性**：
- 自动分配 `<container>.orb.local` 域名 → 从任何设备通过局域网访问
- Rosetta 加速 x86 镜像
- 与 Docker CLI 完全兼容，无需额外配置

**常见问题**：

- **`OPENAI_API_KEY` 未生效**：改 `.env` 后必须 `docker compose up -d --build` 重建
- **Prisma dylib 加载失败**：容器内是 Linux binary，本地 macOS 的 dylib 不影响；如果开发时遇到见 [macOS 说明](#macos-sequoia-特殊说明)
- **端口 3000 被占用**：改 `docker-compose.yml` 里的 `"3000:3000"` 为 `"3001:3000"`
- **想启用 Realtime**：Realtime API 是从浏览器直连 OpenAI（WebRTC），容器化不影响，只要 `.env` 里配了 `OPENAI_API_KEY` 就行

## AI Provider 切换

四个能力（文本 / TTS / STT / Realtime）可独立切换 provider。修改 `.env`：

```
AI_TEXT_PROVIDER=openai       # 或 anthropic / ollama
AI_VOICE_PROVIDER=openai
AI_STT_PROVIDER=openai
AI_REALTIME_PROVIDER=openai
```

配好对应的 `*_API_KEY` 后重启服务即可生效。访问 `/settings` 查看每项能力的当前 provider 与是否就绪。

## 目录结构

```
app/                 Next.js 15 App Router
  (auth)/            登录 / 注册
  (dashboard)/       主应用（需要登录）
  api/               API 路由
components/          UI 组件
lib/
  ai/                AI provider 抽象层
  auth/              iron-session
  db.ts              Prisma client
  env.ts             zod 校验环境变量
prisma/schema.prisma 数据库模型
scripts/             一次性脚本（PDF 解析等）
content/             (gitignored) 用户内容 · 剑桥 PDF · seed 词表
```

## 完整目标树

见 [`docs/GOAL_TREE.md`](docs/GOAL_TREE.md)（P0 阶段建设完成后从计划文档同步过来）

## ⚠️ 本机 macOS Sequoia 特殊说明

系统默认的 `node`（`~/.local/bin/node`）来自 ChatGPT.app，带 Hardened Runtime 会拒绝加载 npm 生态的原生模块（Prisma、Next SWC、sharp 等）。**本项目必须用 `~/.local/node22/bin/node`**（Node.js 官方版）。

已提供包装脚本：

```bash
./scripts/dev.sh                 # 启动 dev server（自动用正确的 node）
./scripts/db.sh generate         # prisma generate
./scripts/db.sh push             # prisma db push
./scripts/db.sh studio           # prisma studio
./scripts/db.sh seed             # 数据 seed
```

不要用 `pnpm dev` / `pnpm db:*`——会用错 node 拉不起来。

## 阶段进度

- [x] P0 · 项目基础设施
- [x] P1 · 5 维评估 + 学习规划器
- [x] P2 · 词汇 SRS
- [x] P3 · 阅读模块（含 PDF 解析）
- [x] P4 · 写作 AI 批改
- [x] P5 · 听力
- [x] P6 · 口语（文本 + Realtime）
- [x] P7 · Docker + Dashboard 完整化
