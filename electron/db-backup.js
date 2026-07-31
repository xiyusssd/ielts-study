// SQLite 库备份的命名与回收 —— 全仓库唯一出口。
//
// 为什么要收拢：此前三个模块各自造备份，三种命名，只有一个做回收：
//   electron/db-init.js            data.db.bak-<stamp>        有回收
//   scripts/migrate-content-ids.ts <db>.pre-idmig-<stamp>     无回收
//   scripts/restore-user-data.mjs  <dest>.pre-restore-<ts>    无回收
// 回收按 `.bak-` 前缀过滤，结构上就管不到另外两类，KEEP 上限形同虚设
// （实测积到 9 份 / 18M 仍在涨）。统一命名后，回收一次覆盖全部来源。
//
// 放在 electron/ 下是打包约束：electron-builder 的 files 只收 electron/**/*
// 与 package.json，主进程从 app.asar 内 require，放到 lib/ 会取不到。
"use strict";

const fs = require("fs");
const path = require("path");

// 时间戳在前、reason 在后：字典序 == 时间序，回收可以直接 sort().slice()
const BACKUP_INFIX = ".bak-";
const KEEP_BACKUPS = 5;

const stamp = () => new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);

/** reason 参与文件名，收紧字符集避免破坏排序或产生歧义分段 */
const slug = (reason) => String(reason).toLowerCase().replace(/[^a-z0-9]/g, "") || "manual";

/**
 * 备份一个库。返回实际写出的路径。
 *
 * 命名 `<db>.bak-<stamp>-<reason>`，绝不覆盖已有文件：同一秒内的重复调用
 * 追加序号，否则一次操作里的两份备份会互相顶掉。
 */
function backupDb(dbPath, reason) {
  const base = `${dbPath}${BACKUP_INFIX}${stamp()}-${slug(reason)}`;
  let target = base;
  for (let n = 2; fs.existsSync(target); n++) target = `${base}.${n}`;
  fs.copyFileSync(dbPath, target);
  return target;
}

/**
 * 只保留最近 keep 份备份，返回被删的文件名。
 *
 * 前缀从 dbPath 推导（旧实现硬编码 "data.db.bak-"，传 dev.db 一个都匹配不到）。
 * 上限是全局的而非按 reason 分组：要卡住的是磁盘占用总量，按 reason 分组会随
 * reason 增多而失控。
 *
 * 不匹配旧命名（pre-idmig / pre-restore）—— 那些是人工留的回滚点，不该被自动清掉。
 */
function pruneBackups(dbPath, keep = KEEP_BACKUPS) {
  const dir = path.dirname(dbPath);
  const prefix = path.basename(dbPath) + BACKUP_INFIX;
  const all = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix))
    .sort();
  // keep=0 要删光。slice(0, -0) 是 slice(0, 0) → 空数组，必须单独分支
  const stale = keep > 0 ? all.slice(0, -keep) : all;
  for (const f of stale) fs.rmSync(path.join(dir, f), { force: true });
  return stale;
}

/** 备份 + 回收，返回备份路径。绝大多数调用点要的是这个。 */
function backupAndPrune(dbPath, reason, keep = KEEP_BACKUPS) {
  const target = backupDb(dbPath, reason);
  const pruned = pruneBackups(dbPath, keep);
  return { target, pruned };
}

module.exports = { backupDb, pruneBackups, backupAndPrune, BACKUP_INFIX, KEEP_BACKUPS };