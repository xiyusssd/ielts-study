/**
 * 把备份库里的「用户学习数据」迁回当前库。
 *
 * 为什么需要它：内容表主键是 cuid() 随机生成，每次 seed 换一整套 id
 * （Word.id 按 spelling 对齐命中 0/5031）。所以旧库的 VocabProgress.wordId
 * 之类外键在新库必然悬空 —— 必须按「自然键」重新映射。
 *
 * 设计：
 *   - 内容表 → 自然键映射表（old_id → new_id），纯 SQL 在 ATTACH 后完成
 *   - 用户表 → 声明式配置（外键 + 去重键），SQL 由配置生成
 *   - 幂等：去重键命中则跳过，可重复执行、可叠加多个来源
 *
 * 用法：
 *   node scripts/restore-user-data.mjs --email a@b.c --from bak1.db [--from bak2.db] [--apply]
 *   不加 --apply 只做 dry-run 报告。
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

const SQLITE = "/usr/bin/sqlite3";
const DEFAULT_DEST = `${process.env.HOME}/Library/Application Support/雅思学习助手/data.db`;

/** 跑一段 SQL，返回按行切好的输出。 */
const sql = (db, text) =>
  execFileSync(SQLITE, [db], { input: text, encoding: "utf8", maxBuffer: 1 << 28 })
    .trim()
    .split("\n")
    .filter(Boolean);

/** 取单值。 */
const one = (db, text) => sql(db, text)[0] ?? "";

/** SQL 字符串字面量转义（单引号翻倍）。 */
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ============ 内容表自然键映射 ============
// old.id → new.id。键必须是「内容本身」，不能依赖随机 id。
// 每项生成一张 temp 表 map_<name>(old_id, new_id)。
const CONTENT_MAPS = {
  word: `SELECT o.id old_id, n.id new_id FROM old.Word o
         JOIN main.Word n ON n.spelling = o.spelling`,

  passage: `SELECT o.id old_id, n.id new_id FROM old.Passage o
            JOIN main.Passage n ON n.source = o.source AND n.module = o.module`,

  // 题目自然键 = 所属篇目的 source + 题号
  question: `SELECT o.id old_id, n.id new_id FROM old.Question o
             JOIN old.Passage op ON op.id = o.passageId
             JOIN main.Passage np ON np.source = op.source AND np.module = op.module
             JOIN main.Question n ON n.passageId = np.id AND n.[index] = o.[index]`,

  writingPrompt: `SELECT o.id old_id, n.id new_id FROM old.WritingPrompt o
                  JOIN main.WritingPrompt n ON n.task = o.task AND n.prompt = o.prompt`,

  speakingPrompt: `SELECT o.id old_id, n.id new_id FROM old.SpeakingPrompt o
                   JOIN main.SpeakingPrompt n ON n.part = o.part AND n.question = o.question`,
};

// ============ 用户表搬迁规则 ============
// 每张表声明：外键怎么 remap、靠什么去重、哪些行算「真实」。
// mode 由引擎推导：源库 == 目标库 → update（改 userId，保留原 id）
//                  源库 != 目标库 → copy（ATTACH + INSERT，id 前缀防撞）
const RULES = [
  {
    table: "Assessment",
    fks: {}, // 无内容外键
    dedupe: ["createdAt"], // 同一时刻的评估视为同一条
  },
  {
    table: "VocabProgress",
    fks: { wordId: "word" },
    dedupe: ["wordId"], // 唯一索引 (userId, wordId)
    // 冲突时保留 updatedAt 更晚的（复习进度以最新为准）
    prefer: "updatedAt",
  },
  {
    table: "Attempt",
    fks: { passageId: "passage", questionId: "question" },
    dedupe: ["createdAt"],
  },
  {
    table: "WritingSubmission",
    fks: { promptId: "writingPrompt" },
    dedupe: ["createdAt"],
  },
  {
    table: "SpeakingSession",
    fks: {},
    dedupe: ["createdAt"],
  },
];

// Profile 不整行搬：目标分/examDate/weeklyHours 被 e2e 脚本污染过，
// 只挑「确认由真人产生」的字段做「目标为空才填」的补齐。
const PROFILE_FIELDS = ["currentBand", "dailyNewWords", "dailyReviewWords", "vocabBook"];

// ============ 真实性判据 ============
// 每条 source 描述「从哪个库的哪个账号、按什么条件挑行」。
// 判据写成 SQL 谓词，可读、可审、可改 —— 不把结论硬编码成 id 清单。
const SOURCES = [
  {
    label: "备份库真实账号（整体搬迁）",
    from: "bak-20260731-150747",
    fromEmail: "xiyu@qq.com",
    // 独立账号，全部数据都是真人产生
    where: { Assessment: "1", VocabProgress: "1", Attempt: "1", WritingSubmission: "1", SpeakingSession: "1" },
    profile: true,
  },
  {
    label: "test 账号中的真人记录",
    from: "self",
    fromEmail: "test@example.com",
    where: {
      // 人做不到 1 秒交卷；真人那两条是 1500s / 900s
      Attempt: "duration >= 60",
      // FSRS 复习进度：平均间隔 30 分钟、跨整天，签名只有「记得/忘了」两种
      VocabProgress: "1",
      // 只有 07-26 那条有真人痕迹（32 词中文 review + 事后手填四科分）
      // 07-24 的两条相隔 24 秒、各段瞬间填满 → e2e 产物
      Assessment: "json_extract(results,'$.sections.reading.raw.manual') = 1",
      // "Sample essay about university education..." → e2e 产物
      WritingSubmission: "0",
      // promptIds = ["test"] → e2e 产物
      SpeakingSession: "0",
    },
    profile: true,
  },
];

// ============ 引擎 ============

/** 解析 argv：--email / --to / --from（可多次，按顺序覆盖 SOURCES 里的备份库） / --apply。 */
const parseArgs = (argv) => {
  const out = { email: "xiyu@qq.com", dest: DEFAULT_DEST, apply: false, froms: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--email") out.email = argv[++i];
    else if (argv[i] === "--to") out.dest = argv[++i];
    else if (argv[i] === "--from") out.froms.push(argv[++i]);
    else if (argv[i] === "--apply") out.apply = true;
  }
  return out;
};

/** 按 email 取 userId。 */
const userIdOf = (db, email) => one(db, `SELECT id FROM User WHERE email=${lit(email)};`);

/** 表的列名清单。 */
const colsOf = (db, table) =>
  sql(db, `SELECT name FROM pragma_table_info(${lit(table)});`);

/**
 * 建自然键映射临时表。
 * 两库内容 id 目前恰好一致，但不能依赖这点 —— 一旦 seed 重跑就会错位。
 *
 * 同库搬迁时建空表：remap 的 COALESCE 会自然回退到原 id（同库 id 本就有效），
 * 这样上层 SQL 不必分叉。
 */
const buildMaps = (srcDb, sameDb) => {
  if (sameDb) {
    return Object.keys(CONTENT_MAPS)
      .map((n) => `CREATE TEMP TABLE map_${n}(old_id TEXT, new_id TEXT);`)
      .join("\n");
  }
  const stmts = [`ATTACH ${lit(srcDb)} AS old;`];
  for (const [name, select] of Object.entries(CONTENT_MAPS)) {
    stmts.push(`CREATE TEMP TABLE map_${name} AS ${select};`);
  }
  return stmts.join("\n");
};

/** map 命中率 —— word map 命中 0 行就说明自然键失效，必须中止。 */
const mapReport = () =>
  Object.keys(CONTENT_MAPS)
    .map((n) => `SELECT 'map.${n}', COUNT(*) FROM map_${n};`)
    .join("\n");

/** 把一列的值经 map 表翻译；map 缺失则原样保留（同库搬迁时 id 本就有效）。 */
const remap = (col, mapName) =>
  `COALESCE((SELECT new_id FROM map_${mapName} WHERE old_id = o.${col}), o.${col})`;

/** 已存在判据：同一目标用户下，去重键全部相等即视为同一条。 */
const existsClause = (rule, destUid) =>
  `EXISTS (SELECT 1 FROM main.${rule.table} d
           WHERE d.userId = ${lit(destUid)}
             AND ${rule.dedupe.map((k) => `d.${k} = o.${k}`).join(" AND ")})`;

/**
 * 跨库搬迁：ATTACH 后 INSERT SELECT。
 * id 加前缀防撞（同一条内容在两库可能撞 id），外键走 map 翻译。
 */
const copySql = (rule, cols, srcUid, destUid, tag) => {
  const pick = cols.map((c) => {
    if (c === "id") return `${lit(tag + "-")} || o.id`;
    if (c === "userId") return lit(destUid);
    const map = rule.fks[c];
    return map ? remap(c, map) : `o.${c}`;
  });
  return `INSERT INTO main.${rule.table} (${cols.join(", ")})
SELECT ${pick.join(", ")}
FROM old.${rule.table} o
WHERE o.userId = ${lit(srcUid)}
  AND (${rule.where})
  AND NOT ${existsClause(rule, destUid)};`;
};

/**
 * 同库搬迁：只改 userId，保留原 id 和全部字段。
 * VocabProgress 有 (userId, wordId) 唯一索引 —— 先按 prefer 列决胜负，
 * 输的那条直接删，避免 UPDATE 撞唯一索引整批回滚。
 */
const moveSql = (rule, srcUid, destUid) => {
  const t = rule.table;
  const [key] = rule.dedupe; // 所有规则的去重键都是单列
  const scope = `userId = ${lit(srcUid)} AND (${rule.where})`;
  const stmts = [];

  if (rule.prefer) {
    // 冲突决胜：目标行更新更晚 → 删源行；否则删目标行给源行让位
    stmts.push(`DELETE FROM ${t} WHERE ${scope} AND ${key} IN (
  SELECT d.${key} FROM ${t} d
  WHERE d.userId = ${lit(destUid)} AND d.${rule.prefer} >= ${t}.${rule.prefer});`);
    stmts.push(`DELETE FROM ${t} WHERE userId = ${lit(destUid)} AND ${key} IN (
  SELECT s.${key} FROM ${t} s WHERE s.userId = ${lit(srcUid)} AND (${rule.where}));`);
  } else {
    // 目标已有同键的行 → 源行是重复，丢掉
    stmts.push(`DELETE FROM ${t} WHERE ${scope} AND ${key} IN (
  SELECT d.${key} FROM ${t} d WHERE d.userId = ${lit(destUid)});`);
  }

  stmts.push(`UPDATE ${t} SET userId = ${lit(destUid)} WHERE ${scope};`);
  return stmts.join("\n");
};

/** 一张表的搬迁 SQL + 计数报告。 */
const planTable = (rule, cols, srcUid, destUid, sameDb, tag) => {
  const body = sameDb
    ? moveSql(rule, srcUid, destUid)
    : copySql(rule, cols, srcUid, destUid, tag);
  const src = sameDb ? "main" : "old";
  return {
    body,
    // 搬之前先数：候选行 / 其中被去重挡掉的
    probe: `SELECT '${rule.table}.候选', COUNT(*) FROM ${src}.${rule.table} o
  WHERE o.userId = ${lit(srcUid)} AND (${rule.where});
SELECT '${rule.table}.已存在', COUNT(*) FROM ${src}.${rule.table} o
  WHERE o.userId = ${lit(srcUid)} AND (${rule.where}) AND ${existsClause(rule, destUid)};`,
  };
};

/** Profile：只补空字段，不覆盖已有值。 */
const planProfile = (srcUid, destUid, sameDb) => {
  const src = sameDb ? "main" : "old";
  const sets = PROFILE_FIELDS.map(
    (f) => `${f} = COALESCE(${f}, (SELECT o.${f} FROM ${src}.Profile o WHERE o.userId = ${lit(srcUid)}))`,
  );
  return `INSERT OR IGNORE INTO main.Profile (userId) VALUES (${lit(destUid)});
UPDATE main.Profile SET ${sets.join(", ")} WHERE userId = ${lit(destUid)};`;
};

// ============ 主流程 ============

/** 备份文件名带秒级时间戳，绝不覆盖已有备份。 */
const backup = (dest) => {
  const ts = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  const target = `${dest}.pre-restore-${ts}`;
  copyFileSync(dest, target);
  return target;
};

/** SOURCES.from → 实际库路径。"self" 表示目标库自身。 */
const resolveFrom = (from, dest) => {
  if (from === "self") return dest;
  if (existsSync(from)) return from;
  const sibling = `${dest}.${from}`;
  if (existsSync(sibling)) return sibling;
  throw new Error(`找不到源库：${from}`);
};

const main = () => {
  const { email, dest, apply, froms } = parseArgs(process.argv.slice(2));
  if (!existsSync(dest)) throw new Error(`目标库不存在：${dest}`);

  const destUid = userIdOf(dest, email);
  if (!destUid) throw new Error(`目标库里没有 ${email}`);
  console.log(`目标：${email} → ${destUid}\n库：${dest}\n模式：${apply ? "APPLY" : "dry-run"}\n`);

  const plans = [];
  let overrideIdx = 0;

  for (const source of SOURCES) {
    const srcDb =
      source.from === "self"
        ? dest
        : resolveFrom(froms[overrideIdx++] ?? source.from, dest);
    const sameDb = srcDb === dest;
    const srcUid = userIdOf(srcDb, source.fromEmail);

    console.log(`── ${source.label}`);
    console.log(`   源：${source.fromEmail} @ ${sameDb ? "同库" : srcDb.split("/").pop()}`);
    if (!srcUid) {
      console.log("   跳过：源库无此账号\n");
      continue;
    }
    if (sameDb && srcUid === destUid) {
      console.log("   跳过：源账号即目标账号\n");
      continue;
    }

    const tag = source.from === "self" ? "self" : source.from.slice(0, 12);
    const head = [buildMaps(srcDb, sameDb)];
    const probes = [];
    const writes = [];

    for (const rule of RULES) {
      const where = source.where[rule.table];
      if (where === "0") continue; // 明确判定为 e2e 产物，整表跳过
      const scoped = { ...rule, where };
      const cols = colsOf(srcDb, rule.table);
      const { body, probe } = planTable(scoped, cols, srcUid, destUid, sameDb, tag);
      probes.push(probe);
      writes.push(body);
    }
    if (source.profile) writes.push(planProfile(srcUid, destUid, sameDb));

    // dry-run：只跑 map + probe，不动数据
    const report = sql(dest, [...head, mapReport(), ...probes].join("\n"));
    for (const line of report) console.log(`   ${line.replace(/\|/g, " = ")}`);
    console.log("");

    plans.push({ label: source.label, sql: [...head, ...writes].join("\n") });
  }

  if (!apply) {
    console.log("以上为 dry-run。确认无误后加 --apply 执行。");
    return;
  }

  const saved = backup(dest);
  console.log(`已备份 → ${saved.split("/").pop()}`);
  for (const plan of plans) {
    // 每个来源一个事务：出错整体回滚，不留半截状态
    sql(dest, `BEGIN;\n${plan.sql}\nCOMMIT;`);
    console.log(`已应用：${plan.label}`);
  }

  console.log("\n── 结果");
  for (const rule of RULES) {
    console.log(
      `   ${rule.table} = ${one(dest, `SELECT COUNT(*) FROM ${rule.table} WHERE userId=${lit(destUid)};`)}`,
    );
  }
};

main();