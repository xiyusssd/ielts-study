// DB 初始化 + 内容同步 + 环境变量组织
// 移植自 scripts/build-standalone-app.sh 的 launcher 段（148-258 行）。
// 关键：主进程零原生依赖 —— sqlite 走系统 /usr/bin/sqlite3 CLI，不 require 任何原生模块。
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { backupAndPrune } = require("./db-backup");

const SQLITE = "/usr/bin/sqlite3";

function sqlite(dbPath, sql) {
  return execFileSync(SQLITE, [dbPath], { input: sql, encoding: "utf8" }).trim();
}

// 内容指纹：各内容表行数拼接，用于判断 template 是否有更新
const FP_SQL =
  "SELECT (SELECT count(*) FROM Word)||'_'||(SELECT count(*) FROM Passage)||'_'||" +
  "(SELECT count(*) FROM Question)||'_'||(SELECT count(*) FROM WritingPrompt)||'_'||" +
  "(SELECT count(*) FROM SpeakingPrompt)||'_'||(SELECT count(*) FROM WordBook);";

// 用户数据表：同步流程绝不允许改动这些表的行数。
// 历史上旧同步逻辑会 DELETE VocabProgress/Attempt/… 来「配合」内容表重灌，
// 结果是内容一变用户进度就清零。现在改为硬约束 + 同步后校验。
const USER_TABLES = [
  "User",
  "Profile",
  "Assessment",
  "VocabProgress",
  "Attempt",
  "WritingSubmission",
  "SpeakingSession",
  "Plan",
  "WeekPlan",
  "DailyTask",
  "FavoriteWord",
  "DictationAttempt",
  "MistakeWord",
];

// 内容表同步规格：自然键 = 内容本身的标识，不依赖随机 id。
// 顺序即依赖顺序（Passage 必须先于 Question 建好映射）。
const CONTENT_SPEC = [
  { table: "Word", key: ["spelling"], fks: {} },
  { table: "Passage", key: ["source", "module"], fks: {} },
  { table: "Question", key: ["passageId", "index"], fks: { passageId: "Passage" } },
  { table: "WritingPrompt", key: ["task", "prompt"], fks: {} },
  { table: "SpeakingPrompt", key: ["part", "question"], fks: {} },
  { table: "WordBook", key: ["slug"], fks: {} },
  { table: "WordChapter", key: ["bookId", "index"], fks: { bookId: "WordBook" } },
  { table: "ChapterWord", key: ["chapterId", "wordId"], fks: { chapterId: "WordChapter", wordId: "Word" } },
];

const q = (name) => `"${name}"`;

/**
 * 生成内容同步 SQL：按自然键 upsert。
 *
 * 三条不变式：
 *   1. 本地 id 永不改变 —— 已存在的行只更新内容列，进度表外键因此始终有效
 *   2. 只增不删 —— 模板里没有的旧内容留在库里（可能有人的历史记录指着它）
 *   3. 不碰 USER_TABLES —— 整个语句里不出现这些表名
 *
 * map 用 TEMP VIEW 而不是快照 TABLE：视图是活查询，父表(如 WordBook)在同一事务里
 * 先 INSERT 的新行，子表(WordChapter)建映射时立刻可见。旧实现用快照，模板新增的
 * 父行不在快照里 → 子行外键翻译成 NULL → 整段 INSERT 违反 NOT NULL 外键而失败。
 * COALESCE(n.id, t.id) 保证「本地还没有的行」映射到自己即将写入的模板 id。
 */
function syncSql(tplDb, colsOf) {
  const out = [`ATTACH '${tplDb}' AS tpl;`, "BEGIN;"];

  for (const { table, key, fks } of CONTENT_SPEC) {
    const cols = colsOf(table);
    const body = cols.filter((c) => c !== "id");

    // 模板行的外键先翻译成本地 id，否则跨库比对必然错位
    const tplVal = (c) =>
      fks[c] ? `(SELECT m.id FROM map_${fks[c]} m WHERE m.tpl_id = t.${q(c)})` : `t.${q(c)}`;
    const joinOn = key.map((k) => `n.${q(k)} IS ${tplVal(k)}`).join(" AND ");

    // tpl_id → 本地 id 映射，供后续表的外键翻译使用（活视图，随主库变化实时更新）
    out.push(`CREATE TEMP VIEW map_${table} AS
  SELECT t.id AS tpl_id, COALESCE(n.id, t.id) AS id FROM tpl.${q(table)} t
  LEFT JOIN main.${q(table)} n ON ${joinOn};`);

    out.push(`UPDATE main.${q(table)} SET ${body.map((c) => `${q(c)} = ${tplVal(c)}`).join(", ")}
  FROM tpl.${q(table)} t
  WHERE main.${q(table)}.id = (SELECT m.id FROM map_${table} m WHERE m.tpl_id = t.id);`);

    out.push(`INSERT INTO main.${q(table)} (id, ${body.map(q).join(", ")})
  SELECT t.id, ${body.map(tplVal).join(", ")} FROM tpl.${q(table)} t
  WHERE NOT EXISTS (SELECT 1 FROM main.${q(table)} n WHERE n.id = t.id);`);
  }

  out.push("COMMIT;", "DETACH tpl;");
  return out.join("\n");
}

/** 同步后自检：用户表行数不变 + 进度表外键无悬空。返回问题列表。 */
function verifySql() {
  return [
    "SELECT 'dangling.VocabProgress', COUNT(*) FROM VocabProgress v LEFT JOIN Word w ON w.id=v.wordId WHERE w.id IS NULL;",
    "SELECT 'dangling.Attempt.passage', COUNT(*) FROM Attempt a LEFT JOIN Passage p ON p.id=a.passageId WHERE a.passageId IS NOT NULL AND p.id IS NULL;",
    "SELECT 'dangling.Attempt.question', COUNT(*) FROM Attempt a LEFT JOIN Question x ON x.id=a.questionId WHERE a.questionId IS NOT NULL AND x.id IS NULL;",
    "SELECT 'dangling.WritingSubmission', COUNT(*) FROM WritingSubmission s LEFT JOIN WritingPrompt p ON p.id=s.promptId WHERE s.promptId IS NOT NULL AND p.id IS NULL;",
    "SELECT 'dangling.ChapterWord.chapter', COUNT(*) FROM ChapterWord c LEFT JOIN WordChapter ch ON ch.id=c.chapterId WHERE ch.id IS NULL;",
    "SELECT 'dangling.ChapterWord.word', COUNT(*) FROM ChapterWord c LEFT JOIN Word w ON w.id=c.wordId WHERE w.id IS NULL;",
    "SELECT 'dangling.FavoriteWord', COUNT(*) FROM FavoriteWord f LEFT JOIN Word w ON w.id=f.wordId WHERE w.id IS NULL;",
    "SELECT 'dangling.MistakeWord', COUNT(*) FROM MistakeWord m LEFT JOIN Word w ON w.id=m.wordId WHERE w.id IS NULL;",
  ].join("\n");
}

/** 用户表行数快照，用于同步前后比对。 */
function countsSql() {
  return USER_TABLES.map((t) => `SELECT '${t}', COUNT(*) FROM ${q(t)};`).join("\n");
}

// 在 data.db 上执行一条 DDL，成功返回 true。
function tryExec(dbPath, sqlText) {
  try {
    sqlite(dbPath, sqlText);
    return true;
  } catch {
    return false;
  }
}

/**
 * 通用 schema 同步：以模板库为准，把老 data.db 缺的表/列/索引全部补齐。
 *
 * 模板库是打包时由 prisma db push 全新建出的，永远与当前代码一致 ——
 * 所以这里不需要（也禁止）手工维护补列清单：schema.prisma 里任何新增的表/列/索引，
 * 老用户下次启动即自动迁移。曾经的 addCol 手工清单漏加 aiBaseUrl/aiApiKey
 * 导致 dashboard P2022 崩溃，就是手工清单漂移的教训。
 *
 * 约束：只增不改 —— 已存在的列绝不 ALTER，新列的类型/默认值永远取自模板。
 */
function syncSchema(dataDb, templateDb, log) {
  let tplTables;
  try {
    tplTables = sqlite(
      templateDb,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations' ORDER BY name;",
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    log("模板库不可用，跳过 schema 同步");
    return;
  }

  const dataTables = new Set(
    sqlite(dataDb, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
      .split("\n")
      .filter(Boolean),
  );
  const dataIndexes = new Set(
    sqlite(dataDb, "SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name;")
      .split("\n")
      .filter(Boolean),
  );

  const addIndexes = (table) => {
    const rows = sqlite(
      templateDb,
      `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='${table}' AND sql IS NOT NULL;`,
    );
    if (!rows) return;
    for (const line of rows.split("\n").filter(Boolean)) {
      const sep = line.indexOf("|");
      const name = line.slice(0, sep);
      if (dataIndexes.has(name)) continue;
      const ddl = line.slice(sep + 1).replace(/^CREATE (UNIQUE )?INDEX /, "CREATE $1INDEX IF NOT EXISTS ");
      if (tryExec(dataDb, ddl)) {
        dataIndexes.add(name);
        log(`schema 补索引 ${name}`);
      }
    }
  };

  for (const table of tplTables) {
    if (!dataTables.has(table)) {
      // 缺表：整表 DDL + 索引照搬模板
      const ddl = sqlite(templateDb, `SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}';`);
      if (ddl && tryExec(dataDb, ddl)) log(`schema 补表 ${table}`);
      else log(`schema 补表失败 ${table}`);
      addIndexes(table);
      continue;
    }

    // 表已存在：缺列补列，类型/默认值取模板 pragma 定义
    const have = new Set(
      sqlite(dataDb, `SELECT name FROM pragma_table_info('${table}');`).split("\n").filter(Boolean),
    );
    const want = sqlite(
      templateDb,
      `SELECT name, COALESCE("type",''), COALESCE("notnull",0), COALESCE("dflt_value",'') FROM pragma_table_info('${table}');`,
    );
    if (want) {
      for (const row of want.split("\n").filter(Boolean)) {
        const [name, type, notnull, dflt] = row.split("|");
        if (have.has(name)) continue;
        const base = `ALTER TABLE ${q(table)} ADD COLUMN ${q(name)} ${type || "TEXT"}`;
        // NOT NULL 无默认值只能对空表生效；非空表退化为补可空列
        let ok = dflt ? tryExec(dataDb, `${base} DEFAULT ${dflt};`) : false;
        if (!ok && notnull === "1") ok = tryExec(dataDb, `${base} NOT NULL;`);
        if (!ok) ok = tryExec(dataDb, `${base};`);
        log(ok ? `schema 补列 ${table}.${name}` : `schema 补列失败 ${table}.${name}`);
      }
    }

    // 既有表也可能缺新索引（性能项，失败不致命）
    addIndexes(table);
  }
}

/** 解析 "key|value" 行为 Map。 */
function parseRows(text) {
  const map = new Map();
  for (const line of text.split("\n").filter(Boolean)) {
    const i = line.indexOf("|");
    map.set(line.slice(0, i), Number(line.slice(i + 1)));
  }
  return map;
}

/**
 * 内容同步：先在影子副本上做，自检通过才换回真库。
 * 真库在验证通过前完全不被写入 —— 同步出问题最多浪费一次拷贝。
 */
function syncContent({ dataDb, templateDb, log }) {
  const shadow = dataDb + ".sync-tmp";
  const colsOf = (table) =>
    sqlite(dataDb, `SELECT name FROM pragma_table_info('${table}');`).split("\n").filter(Boolean);

  try {
    const before = parseRows(sqlite(dataDb, countsSql()));
    fs.rmSync(shadow, { force: true });
    fs.copyFileSync(dataDb, shadow);
    sqlite(shadow, syncSql(templateDb, colsOf));

    // 闸门 1：用户数据一行都不能少
    const after = parseRows(sqlite(shadow, countsSql()));
    for (const [table, n] of before) {
      if (after.get(table) !== n) {
        throw new Error(`用户表 ${table} 行数变化 ${n} → ${after.get(table)}`);
      }
    }
    // 闸门 2：进度记录的内容外键不能悬空
    for (const [what, n] of parseRows(sqlite(shadow, verifySql()))) {
      if (n > 0) throw new Error(`${what} 出现 ${n} 条悬空外键`);
    }

    const { target, pruned } = backupAndPrune(dataDb, "sync");
    fs.renameSync(shadow, dataDb);
    if (pruned.length) log(`清理旧备份 ${pruned.length} 份`);
    log(`内容同步完成（备份 ${path.basename(target)}）`);
    return true;
  } catch (e) {
    fs.rmSync(shadow, { force: true });
    log("内容同步失败，已放弃同步，真实数据未被改动: " + e.message);
    return false;
  }
}

// 首启拷贝模板 + 非首启 schema 同步 + 内容同步
function initDatabase({ dataDir, templateDb, log = console.log }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const dataDb = path.join(dataDir, "data.db");

  if (!fs.existsSync(dataDb)) {
    fs.copyFileSync(templateDb, dataDb);
    log("数据库从模板初始化");
    return;
  }

  // 老库升级：以模板为准自动补齐表/列/索引（必须在指纹/内容同步之前，否则 syncSql 读不到表）
  syncSchema(dataDb, templateDb, log);

  // 内容指纹比对：不同则同步题库/词库
  let tplFp = "";
  let dataFp = "";
  try {
    tplFp = sqlite(templateDb, FP_SQL);
    dataFp = sqlite(dataDb, FP_SQL);
  } catch (e) {
    log("指纹比对失败，跳过内容同步: " + e.message);
  }
  // 同步判据是「模板指纹变了没」，不是「两库指纹相等吗」。
  // 因为同步只增不删，本库指纹可能永远追不上模板（模板下架内容时），
  // 用相等做判据会导致每次启动都重跑同步、每次都堆一个备份。
  const marker = path.join(dataDir, ".content-synced");
  const synced = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8").trim() : "";
  if (tplFp && tplFp !== synced && tplFp !== dataFp) {
    log(`内容有更新（${dataFp} → ${tplFp}），同步题库/词库...`);
    if (syncContent({ dataDb, templateDb, log })) fs.writeFileSync(marker, tplFp);
  } else if (tplFp && !synced) {
    fs.writeFileSync(marker, tplFp);
  }
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
function buildEnv({ dataDir, port, instanceId, log = console.log }) {
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
    // 文本能力默认走 tokenrhythm 网关（OpenAI 兼容），设置页可在线换模型
    OPENAI_TEXT_API_KEY: "sk_tr_wwuZY4zWOXT16fCTM0RdrCcxpFvezyF7i9ceuoYN4cU",
    OPENAI_TEXT_BASE_URL: "https://tokenrhythm.studio/v1",
    OPENAI_TEXT_MODEL: "deepseek-v4-flash",
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
  // 实例指纹是启动器的身份凭据，排在覆盖之后，不接受用户 .env 篡改
  return { ...env, ...userEnv, APP_INSTANCE_ID: instanceId || "" };
}

module.exports = { initDatabase, buildEnv, syncSchema };
