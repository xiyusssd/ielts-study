// DB 初始化 + 内容同步 + 环境变量组织
// 移植自 scripts/build-standalone-app.sh 的 launcher 段（148-258 行）。
// 关键：主进程零原生依赖 —— sqlite 走系统 /usr/bin/sqlite3 CLI，不 require 任何原生模块。
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const SQLITE = "/usr/bin/sqlite3";

function sqlite(dbPath, sql) {
  return execFileSync(SQLITE, [dbPath], { input: sql, encoding: "utf8" }).trim();
}

// 内容指纹：各内容表行数拼接，用于判断 template 是否有更新
const FP_SQL =
  "SELECT (SELECT count(*) FROM Word)||'_'||(SELECT count(*) FROM Passage)||'_'||" +
  "(SELECT count(*) FROM Question)||'_'||(SELECT count(*) FROM WritingPrompt)||'_'||" +
  "(SELECT count(*) FROM SpeakingPrompt);";

// 内容同步：清理内容表 + 强依赖内容 id 的进度记录，从 template 重灌。
// 保留 User/Profile/Assessment/Plan/WeekPlan/DailyTask（账号/评估/计划）。
const SYNC_SQL = (tplDb) => `PRAGMA foreign_keys=OFF;
ATTACH '${tplDb}' AS tpl;
BEGIN;
DELETE FROM VocabProgress;
DELETE FROM Attempt;
DELETE FROM WritingSubmission;
DELETE FROM SpeakingSession;
DELETE FROM Question;
DELETE FROM Passage;
DELETE FROM Word;
DELETE FROM WritingPrompt;
DELETE FROM SpeakingPrompt;
INSERT INTO Word SELECT * FROM tpl.Word;
INSERT INTO Passage SELECT * FROM tpl.Passage;
INSERT INTO Question SELECT * FROM tpl.Question;
INSERT INTO WritingPrompt SELECT * FROM tpl.WritingPrompt;
INSERT INTO SpeakingPrompt SELECT * FROM tpl.SpeakingPrompt;
COMMIT;
DETACH tpl;`;

// 幂等补列：新版加的可空列在这里补，老 data.db 缺列会崩
function addCol(dbPath, table, col, def, log) {
  try {
    sqlite(dbPath, `SELECT ${col} FROM ${table} LIMIT 1;`);
  } catch {
    try {
      sqlite(dbPath, `ALTER TABLE ${table} ADD COLUMN ${def};`);
      log(`schema 补列 ${table}.${col}`);
    } catch {
      /* 忽略 */
    }
  }
}

// 首启拷贝模板 + 非首启内容同步 + schema 补列
function initDatabase({ dataDir, templateDb, log = console.log }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const dataDb = path.join(dataDir, "data.db");

  if (!fs.existsSync(dataDb)) {
    fs.copyFileSync(templateDb, dataDb);
    log("数据库从模板初始化");
    return;
  }

  // 内容指纹比对：不同则同步题库/词库
  let tplFp = "";
  let dataFp = "";
  try {
    tplFp = sqlite(templateDb, FP_SQL);
    dataFp = sqlite(dataDb, FP_SQL);
  } catch (e) {
    log("指纹比对失败，跳过内容同步: " + e.message);
  }
  if (tplFp && tplFp !== dataFp) {
    log(`内容有更新（${dataFp} → ${tplFp}），同步题库/词库...`);
    fs.copyFileSync(dataDb, dataDb + ".bak");
    try {
      sqlite(dataDb, SYNC_SQL(templateDb));
      log("内容同步完成（备份 data.db.bak）");
    } catch (e) {
      log("内容同步失败，回滚: " + e.message);
      fs.copyFileSync(dataDb + ".bak", dataDb);
    }
  }

  // schema 升级：补齐用户表新增可空列
  addCol(dataDb, "Profile", "dailyNewWords", "dailyNewWords INTEGER", log);
  addCol(dataDb, "Profile", "dailyReviewWords", "dailyReviewWords INTEGER", log);
  addCol(dataDb, "Profile", "vocabBook", "vocabBook TEXT", log);
}

// 解析用户 .env（手写 dotenv：KEY=VALUE，忽略注释/空行，去引号）
function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// 组织 server 子进程的环境变量（对应 launcher 232-258 行）
function buildEnv({ dataDir, port, log = console.log }) {
  const dataDb = path.join(dataDir, "data.db");
  const secretFile = path.join(dataDir, "session-secret");
  if (!fs.existsSync(secretFile)) {
    fs.writeFileSync(secretFile, crypto.randomBytes(48).toString("base64"));
  }
  const env = {
    ...process.env,
    DATABASE_URL: `file:${dataDb}`,
    SESSION_SECRET: fs.readFileSync(secretFile, "utf8").trim(),
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
    NEXT_TELEMETRY_DISABLED: "1",
    AI_TEXT_PROVIDER: "openai",
    AI_VOICE_PROVIDER: "openai",
    AI_STT_PROVIDER: "openai",
    AI_REALTIME_PROVIDER: "openai",
    OPENAI_BASE_URL: "https://api.openai.com/v1",
    OPENAI_TEXT_BASE_URL: "https://airouter.linkof.link/v1",
    OPENAI_TEXT_MODEL: "gpt-5.6-sol",
    OPENAI_TTS_MODEL: "tts-1",
    OPENAI_STT_MODEL: "whisper-1",
    OPENAI_REALTIME_MODEL: "gpt-4o-realtime-preview",
    ANTHROPIC_TEXT_MODEL: "claude-sonnet-4-6",
    OLLAMA_BASE_URL: "http://localhost:11434",
    OLLAMA_TEXT_MODEL: "qwen2.5:7b",
  };
  // 用户 .env 覆盖（填 API key 用）
  const userEnv = parseEnvFile(path.join(dataDir, ".env"));
  if (Object.keys(userEnv).length) log("已加载用户 .env 覆盖");
  return { ...env, ...userEnv };
}

module.exports = { initDatabase, buildEnv };
