# 雅思学习助手 · IELTS Study Assistant

[![CI](https://github.com/xiyusssd/ielts-study/actions/workflows/ci.yml/badge.svg)](https://github.com/xiyusssd/ielts-study/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8)](https://web.dev/progressive-web-apps/)

AI 驱动的 IELTS 备考平台：5 维水平测试 → 个性化学习计划 → 5 大模块 (词汇 · 阅读 · 听力 · 写作 · 口语) 闭环训练。

An AI-powered IELTS preparation platform: a 5-dimension placement test feeds a personalized study plan, with closed-loop practice across five modules — vocabulary, reading, listening, writing, and speaking.

> ⚠️ 本仓库为**公开**仓库。剑桥真题 PDF/音频、剑桥词典等版权内容已通过 `.gitignore` 排除，请勿强行提交；本地如需完整数据请自行获取放入 `content/`。

公开 macOS Release 使用 `PUBLIC_RELEASE=1 ./scripts/build-electron-app.sh`，在不含本地 `.env` 的干净源码副本中构建。公开包只附内置示例题库，不含剑桥真题、私人学习记录或 API Key。AI 功能需在设置中填写自己的凭据，或在 `~/Library/Application Support/雅思学习助手/.env` 中配置。构建后可用 `python3 scripts/check-public-package.py "dist-electron/mac-arm64/雅思学习助手.app"` 检查公开包。

## 功能总览

| 模块 | 能力 |
| --- | --- |
| 🧭 水平评估 | 5 维（词汇 / 阅读 / 听力 / 写作 / 口语）自适应测评，生成 Band 预估报告 |
| 📅 学习计划 | 根据测评结果自动生成个性化备考计划 |
| 📚 词汇 | 真题词书、FSRS 间隔重复、单词/句子拼写、听写、错词本、生词本、AI 词根词缀与小故事 |
| 📖 阅读 | 剑桥真题阅读 + 自动判分（含 TFNG 题型） |
| 🎧 听力 | 真题听力 + 精听 / 听写 + 逐词 diff 批改 |
| ✍️ 写作 | AI 批改（Task 1 / Task 2）+ 范文库 + 模板 |
| 🎤 口语 | Part 1/2/3 练习，AI 评分 + Realtime 实时对话 |

## 技术栈

- **框架**：Next.js 15 (App Router) · React 19 · TypeScript
- **数据库**：Prisma + SQLite（本地）/ PostgreSQL（Docker）
- **AI**：OpenAI / Anthropic / Ollama 可切换（文本 · TTS · STT · Realtime）
- **UI**：Tailwind CSS · Radix UI · Recharts · lucide-react
- **认证**：iron-session（密码 + bcryptjs）
- **部署**：PWA · Docker (OrbStack) · Electron 桌面端

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

### 词汇模块功能

- **真题词书**：`pnpm build:book-vocab` 从剑桥真题 Passage 挖词统计考频，生成「阅读真题词书」与「听力高频词书」；支持自建词书与章节管理（`/vocab/books`）
- **多模式学习**：翻卡 / 单词拼写 / 句子拼写，FSRS 间隔重复（`/vocab/study`）
- **单词听写**：逐词听写 + 自动批改 + 错词收集（`/vocab/dictation`）
- **错词本 & 生词本**：错词复习（`/vocab/mistakes`）、生词收藏（`/vocab/favorites`，学习卡片中按 `Ctrl+Q` 快速收藏）
- **AI 深度记忆**：单词详情页展示真题考频、英文释义、词根词缀、派生词、中文助记与单词小故事（`/vocab/[wordId]`）；「AI 小故事」页可从错词/生词本/最近学过中抽词生成语境故事（`/vocab/story`）
