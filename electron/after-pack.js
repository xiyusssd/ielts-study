// electron-builder afterPack hook
// 修复：electron-builder 会把 standalone 的 node_modules 收进 app.asar，
// 但 spawn 的 node22（非 electron 的 node）无法从 asar 内 require。
// 故打包后把 .next/standalone/node_modules 完整复制到 Resources/app/node_modules，
// 与 server.js 同级，确保脱离仓库后 require('next')/prisma 引擎可解析。
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

exports.default = async function afterPack(context) {
  // 仅 mac
  const appName = context.packager.appInfo.productFilename;
  const resourcesDir = path.join(
    context.appOutDir,
    `${appName}.app`,
    "Contents",
    "Resources",
  );
  const src = path.join(context.packager.projectDir, ".next", "standalone", "node_modules");
  const dst = path.join(resourcesDir, "app", "node_modules");

  if (!fs.existsSync(src)) {
    throw new Error(`afterPack: 源 node_modules 不存在: ${src}（先跑 next build）`);
  }
  if (fs.existsSync(dst)) {
    fs.rmSync(dst, { recursive: true, force: true });
  }
  // cp -R 保留 pnpm 的相对 symlink + .pnpm 实体（standalone 的 node_modules 自包含）
  execFileSync("/bin/cp", ["-R", src, dst]);

  // 校验 prisma 引擎与 next 入口就位
  const engine = path.join(dst, ".pnpm");
  const hasNext = fs.existsSync(path.join(dst, "next"));
  console.log(`  [afterPack] node_modules 复制完成 → ${dst}（next 入口: ${hasNext ? "✓" : "✗"}, .pnpm: ${fs.existsSync(engine) ? "✓" : "✗"}）`);
  if (!hasNext) {
    throw new Error("afterPack: 复制后仍缺 next 入口，server.js 会崩");
  }
};
