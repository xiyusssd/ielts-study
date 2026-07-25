# 贡献指南

欢迎贡献！

## 开发流程

1. Fork 仓库
2. 克隆到本地：`git clone https://github.com/YOUR_NAME/ielts-study.git`
3. 装依赖：`pnpm install`
4. 起本地 dev：`./start.sh local`
5. 改代码
6. 跑测试：`./node_modules/.bin/tsx scripts/e2e-full.mjs`
7. 提 PR

## 代码规范

- **TypeScript strict** · 无 any 除非明确合理
- **Server Components** 优先 · Client Components 显式 `"use client"`
- **服务端操作**用 Server Actions（`"use server"`），复杂查询走 Route Handlers
- **AI 调用**必须通过 `lib/ai` 抽象层
- **认证边界**：所有需登录的 action 用 `requireUserOrRedirect()`
- **样式**：Tailwind + shadcn/ui · 用 `cn()` 合并类名 · 尽量用主题色（`text-primary` 等）
- **命名**：文件 kebab-case · 组件 PascalCase · 变量 camelCase

## 提交规范

用 Conventional Commits：
- `feat:` 新功能
- `fix:` bug 修复
- `refactor:` 重构（不改行为）
- `perf:` 性能优化
- `docs:` 文档
- `test:` 测试
- `chore:` 杂项

## 测试

- **E2E**：`scripts/e2e-full.mjs` · 覆盖 20+ 路由和判分算法
- **手动**：改动 UI 后至少手测过一次

## 加新的 AI Provider

1. 在 `lib/ai/providers/<name>.ts` 实现 `AIProvider` 接口
2. 在 `lib/ai/index.ts` 的 `REGISTRY` 注册
3. 在 `lib/env.ts` 的 `providerEnum` 加值
4. 在 `.env.example` 补充配置示例

## Bug / 建议

- Bug：使用 [Bug 反馈模板](.github/ISSUE_TEMPLATE/bug_report.md)
- 功能建议：使用 [Feature 模板](.github/ISSUE_TEMPLATE/feature_request.md)

## 许可

贡献即同意你的代码以 [MIT 许可](LICENSE) 发布。
