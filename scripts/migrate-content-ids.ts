/**
 * 一次性迁移：把内容表主键从 cuid() 随机值改写成 lib/content/id.ts 的确定性 id。
 *
 * 为什么必须做：LIVE 与 build/template.db 的内容 id 交集为 0，行数指纹却相同。
 * 指纹一旦因任何原因错开，旧同步逻辑就用 template 覆盖 LIVE —— 这是练习记录
 * 被反复清零的机制本身。三库 id 对齐后，同步退化成 upsert，覆盖与悬空都不可能发生。
 *
 * 引用面（已对库核实）：
 *   外键 ON UPDATE CASCADE 自动跟随，无需手工改
 *     Word.id          → VocabProgress.wordId
 *     Passage.id       → Question.passageId
 *     Question.id      → Attempt.questionId
 *     WritingPrompt.id → WritingSubmission.promptId
 *   无外键约束 / 藏在 JSON 里，必须手工改写
 *     Attempt.passageId          建表语句里没有 FK
 *     Attempt.answers            JSON 的 key 是 questionId
 *     SpeakingSession.promptIds  JSON 数组
 *
 * 也承担 id 形态升级：脚本只比较「当前 id」与「lib/content/id.ts 现在算出的 id」，
 * 所以 contentId 的构造规则一旦调整（如 ":" → "~" 以适配路由段），重跑即完成对齐。
 *
 * 安全设计：
 *   - 动手前自动整文件备份（三库均 journal_mode=delete，复制即完整快照）
 *   - 两段式改名（old → __mig_n → new），任何中间态都不可能撞主键
 *   - 幂等：已是确定性 id 的行算出同一值，重跑无副作用
 *   - 全库 TEXT 列扫描：若有未声明的地方引用了旧 id，直接中止而不是留下悬空
 *
 * 用法：
 *   tsx scripts/migrate-content-ids.ts            # dry-run 报告
 *   tsx scripts/migrate-content-ids.ts --apply    # 实际写入
 *   tsx scripts/migrate-content-ids.ts --db a.db  # 只处理指定库（可重复）
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { contentId } from "../lib/content/id";

const SQLITE = "/usr/bin/sqlite3";

const DEFAULT_DBS = [
  `${process.env.HOME}/Library/Application Support/雅思学习助手/data.db`,
  "prisma/dev.db",
  "build/template.db",
];

/** 跑一段 SQL，不取结果。 */
const exec = (db: string, text: string): void => {
  execFileSync(SQLITE, [db], { input: text, encoding: "utf8", maxBuffer: 1 << 28 });
};

/** 跑一段 SQL，按 JSON 取结果。空结果集时 sqlite3 输出空串。 */
const rows = <T>(db: string, text: string): T[] => {
  const out = execFileSync(SQLITE, ["-json", db], {
    input: text,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  }).trim();
  return out ? (JSON.parse(out) as T[]) : [];
};

/** SQL 字符串字面量转义（单引号翻倍）。 */
const lit = (s: string): string => `'${String(s).replace(/'/g, "''")}'`;

// ============ 内容表声明 ============
// 每张表只说两件事：自然键怎么查出来、新 id 怎么算。这是迁移的唯一配置面。
type Row = Record<string, string | number>;

type Spec = {
  table: string;
  /** 查出 id 与自然键。自然键必须是内容本身，不能依赖随机 id。 */
  select: string;
  newId: (r: Row) => string;
};

const SPECS: Spec[] = [
  {
    table: "Word",
    select: "SELECT id, spelling FROM Word",
    newId: (r) => contentId.word(String(r.spelling)),
  },
  {
    table: "Passage",
    select: "SELECT id, source FROM Passage",
    newId: (r) => contentId.passage(String(r.source)),
  },
  {
    // 题目 id = 篇目新 id + 题号。所以取篇目的 source，而不是随机的 passageId。
    table: "Question",
    select:
      "SELECT q.id, p.source, q.[index] AS idx FROM Question q JOIN Passage p ON p.id = q.passageId",
    newId: (r) => contentId.question(contentId.passage(String(r.source)), Number(r.idx)),
  },
  {
    table: "WritingPrompt",
    select: "SELECT id, task, prompt FROM WritingPrompt",
    newId: (r) => contentId.writingPrompt(String(r.task), String(r.prompt)),
  },
  {
    table: "SpeakingPrompt",
    select: "SELECT id, part, question FROM SpeakingPrompt",
    newId: (r) => contentId.speakingPrompt(Number(r.part), String(r.question)),
  },
];

// ============ 外键之外的引用 ============
// 被 FK ON UPDATE CASCADE 覆盖的列不在这里 —— 那些是 SQLite 自己跟着改的。
// 这里只放 CASCADE 管不到的两类：没有 FK 约束的普通列、藏在 JSON 里的 id。

/** 普通列：值指向内容 id，但建表语句里没写 FK，必须自己 UPDATE。 */
const PLAIN_REFS = [{ table: "Attempt", column: "passageId", from: "Passage" }] as const;

/** JSON 列的重写结果：新值 + 命中数。hits=0 表示这行不用动。 */
type Rewrite = { next: unknown; hits: number };

const JSON_REFS: {
  table: string;
  column: string;
  from: string;
  remap: (value: unknown, map: Map<string, string>) => Rewrite;
}[] = [
  {
    // Attempt.answers = { [questionId]: userAnswer } —— id 是对象的 key
    table: "Attempt",
    column: "answers",
    from: "Question",
    remap: (value, map) => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return { next: value, hits: 0 };
      }
      let hits = 0;
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const mapped = map.get(k);
        if (mapped && mapped !== k) hits++;
        next[mapped ?? k] = v;
      }
      return { next, hits };
    },
  },
  {
    // SpeakingSession.promptIds = ["<promptId>", ...] —— id 是数组元素
    table: "SpeakingSession",
    column: "promptIds",
    from: "SpeakingPrompt",
    remap: (value, map) => {
      if (!Array.isArray(value)) return { next: value, hits: 0 };
      let hits = 0;
      const next = value.map((v) => {
        const mapped = typeof v === "string" ? map.get(v) : undefined;
        if (mapped && mapped !== v) hits++;
        return mapped ?? v;
      });
      return { next, hits };
    },
  },
];

/**
 * 自然键列：id 的输入，不是指向 id 的引用，因此不迁移。
 *
 * 为什么要显式声明：第一轮迁移让 Passage.id 直接等于 source，
 * 于是第二轮（":" → "~"）里 source 的字面量恰好等于旧 id，会被审计当成悬空引用。
 * 它不是引用 —— source 保持 `cambridge:c13-t1-p1`，id 变成 `cambridge~c13-t1-p1`，
 * 二者由 contentId.passage() 确定映射。listening 解析册/套/section 依赖 source 原样保留。
 */
const NATURAL_KEYS = ["Word.spelling", "Passage.source"] as const;

// 已被上面三种机制（FK CASCADE / PLAIN_REFS / JSON_REFS）覆盖的列。
// 审计时跳过它们，剩下的列若还出现旧 id，说明有我没声明的引用面。
const COVERED = new Set([
  ...SPECS.map((s) => `${s.table}.id`),
  ...NATURAL_KEYS,
  "VocabProgress.wordId",
  "Question.passageId",
  "Attempt.questionId",
  "WritingSubmission.promptId",
  ...PLAIN_REFS.map((r) => `${r.table}.${r.column}`),
  ...JSON_REFS.map((r) => `${r.table}.${r.column}`),
]);

/**
 * 从一段文本里摘出「可能是内容 id」的 token。
 *
 * 不能写死 cuid 形状：第一轮旧 id 是 cuid（`c` + 24 位 base36），
 * 第二轮旧 id 已是 slug 形态（`cambridge:c13-t1-p1`、`wp:3f2a…`）。
 * 所以按 id 允许的字符集切 run，再与旧 id 集合求交 —— 比逐列 instr 扫描便宜几个数量级。
 *
 * 顺带产出去掉尾部标点的变体：JSON 里 id 被引号包住是精确的，
 * 正文里可能写成 `见 cambridge:c13-t1-p1。` 这种带尾巴的形式。
 */
const idTokens = (text: string): string[] =>
  (text.match(/[A-Za-z0-9:._~-]{3,}/g) ?? []).flatMap((run) => {
    const trimmed = run.replace(/[.\-~:]+$/, "");
    return trimmed === run ? [run] : [run, trimmed];
  });

/**
 * 全库扫描：除已覆盖的列外，还有谁在引用旧 id。
 * 有未声明的引用面就中止，而不是迁完留下一堆悬空。
 */
const auditStaleRefs = (db: string, oldIds: Set<string>): string[] => {
  const tables = rows<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  ).map((r) => r.name);

  const findings: string[] = [];
  for (const table of tables) {
    const cols = rows<{ name: string; type: string }>(db, `PRAGMA table_info(${table})`)
      .filter((c) => /char|clob|text/i.test(c.type))
      .map((c) => c.name)
      .filter((name) => !COVERED.has(`${table}.${name}`));

    for (const col of cols) {
      const vals = rows<{ v: string | null }>(
        db,
        `SELECT [${col}] AS v FROM [${table}] WHERE [${col}] IS NOT NULL`,
      );
      const hit = new Set<string>();
      for (const { v } of vals) {
        for (const token of idTokens(String(v))) {
          if (oldIds.has(token)) hit.add(token);
        }
      }
      if (hit.size > 0) {
        findings.push(`${table}.${col} 引用了 ${hit.size} 个旧内容 id（例：${[...hit][0]}）`);
      }
    }
  }
  return findings;
};

// ============ 映射构建 ============
type Pairs = { table: string; all: Map<string, string>; changed: [string, string][] };

/** 算出一张内容表的 old→new。顺带验单射：两行算出同一 id 就直接中止。 */
const buildPairs = (db: string, spec: Spec): Pairs => {
  const all = new Map<string, string>();
  const seen = new Map<string, string>();
  const changed: [string, string][] = [];

  for (const r of rows<Row>(db, spec.select)) {
    const oldId = String(r.id);
    const newId = spec.newId(r);
    if (!newId) throw new Error(`${spec.table} ${oldId} 算出空 id，自然键缺失`);

    const clash = seen.get(newId);
    if (clash) throw new Error(`${spec.table} 单射性破坏：${clash} 与 ${oldId} 都算出 ${newId}`);
    seen.set(newId, oldId);

    all.set(oldId, newId);
    if (oldId !== newId) changed.push([oldId, newId]);
  }
  return { table: spec.table, all, changed };
};

/**
 * 两段式改名 SQL。
 *
 * 为什么两段：若某行的新 id 恰好等于另一行尚未迁移的旧 id，一段式会撞主键。
 * 先全部搬到 __mig_ 前缀的临时命名空间（与任何真实 id 都不可能相同），再落到新 id。
 * FK 的 ON UPDATE CASCADE 会跟着走两趟，中间态同样满足唯一约束。
 */
const renameSql = (table: string, changed: [string, string][]): string => {
  // 分批插入：多行 VALUES 在部分 SQLite 版本受 compound-select 上限约束。
  const CHUNK = 500;
  const inserts: string[] = [];
  for (let i = 0; i < changed.length; i += CHUNK) {
    const values = changed
      .slice(i, i + CHUNK)
      .map(([o, n], j) => `(${lit(o)}, ${lit(`__mig_${table}_${i + j}`)}, ${lit(n)})`)
      .join(",\n    ");
    inserts.push(`INSERT INTO temp.map_${table}(old_id, tmp_id, new_id) VALUES\n    ${values};`);
  }

  return [
    `DROP TABLE IF EXISTS temp.map_${table};`,
    `CREATE TEMP TABLE map_${table}(old_id TEXT PRIMARY KEY, tmp_id TEXT, new_id TEXT);`,
    ...inserts,
    `UPDATE [${table}] SET id = (SELECT tmp_id FROM temp.map_${table} m WHERE m.old_id = [${table}].id)
     WHERE id IN (SELECT old_id FROM temp.map_${table});`,
    `UPDATE [${table}] SET id = (SELECT new_id FROM temp.map_${table} m WHERE m.tmp_id = [${table}].id)
     WHERE id IN (SELECT tmp_id FROM temp.map_${table});`,
  ].join("\n");
};

/**
 * JSON 列重写。SQL 改不了 JSON 的 key，所以在 JS 里解析→重映射→回写。
 * 只有真正命中旧 id 的行才生成 UPDATE，避免把没变的行重新序列化。
 */
const jsonSql = (
  db: string,
  ref: (typeof JSON_REFS)[number],
  map: Map<string, string>,
): { sql: string[]; changed: number } => {
  const sql: string[] = [];
  for (const r of rows<{ id: string; v: string }>(
    db,
    `SELECT id, [${ref.column}] AS v FROM [${ref.table}] WHERE [${ref.column}] IS NOT NULL`,
  )) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(r.v);
    } catch {
      continue; // 不是合法 JSON，不是我们要改的东西
    }
    const { next, hits } = ref.remap(parsed, map);
    if (hits === 0) continue;
    sql.push(
      `UPDATE [${ref.table}] SET [${ref.column}] = ${lit(JSON.stringify(next))} WHERE id = ${lit(r.id)};`,
    );
  }
  return { sql, changed: sql.length };
};

// ============ 主流程 ============
const main = (): void => {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const picked = argv.reduce<string[]>(
    (acc, a, i) => (a === "--db" && argv[i + 1] ? [...acc, argv[i + 1]] : acc),
    [],
  );
  const dbs = picked.length > 0 ? picked : DEFAULT_DBS;
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);

  for (const db of dbs) {
    console.log(`\n########## ${db}`);
    if (!existsSync(db)) {
      console.log("  跳过：文件不存在");
      continue;
    }

    const broken = rows<Row>(db, "PRAGMA foreign_key_check");
    if (broken.length > 0) {
      console.log(`  中止：迁移前已有 ${broken.length} 条外键违规，先修数据再迁移`);
      continue;
    }

    const pairs = SPECS.map((s) => buildPairs(db, s));
    const oldIds = new Set(pairs.flatMap((p) => p.changed.map(([o]) => o)));

    const stale = auditStaleRefs(db, oldIds);
    if (stale.length > 0) {
      console.log("  中止：存在未声明的旧 id 引用，迁移会留下悬空");
      for (const s of stale) console.log(`    - ${s}`);
      continue;
    }

    const statements: string[] = [];
    for (const p of pairs) {
      const total = p.all.size;
      console.log(`  ${p.table}: ${p.changed.length}/${total} 需改写`);
      if (p.changed.length === 0) continue;
      const [o, n] = p.changed[0];
      console.log(`    例：${o} → ${n}`);
      statements.push(renameSql(p.table, p.changed));
    }

    // 只把「真正改名的 old→new」交给下游。恒等项（old==new）若混进来，
    // JSON 重写会把没变的行也算作命中，幂等性就没了。
    const renames = new Map(pairs.map((p) => [p.table, new Map(p.changed)]));

    for (const ref of PLAIN_REFS) {
      if (!renames.get(ref.from)?.size) continue;
      statements.push(
        `UPDATE [${ref.table}] SET [${ref.column}] =
           (SELECT new_id FROM temp.map_${ref.from} m WHERE m.old_id = [${ref.table}].[${ref.column}])
         WHERE [${ref.column}] IN (SELECT old_id FROM temp.map_${ref.from});`,
      );
      console.log(`  ${ref.table}.${ref.column}: 按 ${ref.from} 映射改写（无 FK，手工）`);
    }

    for (const ref of JSON_REFS) {
      const map = renames.get(ref.from);
      if (!map?.size) continue;
      const { sql, changed } = jsonSql(db, ref, map);
      if (changed === 0) continue;
      statements.push(...sql);
      console.log(`  ${ref.table}.${ref.column}: ${changed} 行 JSON 需重写`);
    }

    if (statements.length === 0) {
      console.log("  已是确定性 id，无需迁移");
      continue;
    }
    if (!apply) {
      console.log(`  dry-run：将执行 ${statements.length} 段 SQL（加 --apply 才写入）`);
      continue;
    }

    const backup = `${db}.pre-idmig-${stamp}`;
    copyFileSync(db, backup);
    console.log(`  已备份 → ${backup}`);

    // PRAGMA 必须在事务外设置，否则是 no-op，CASCADE 就不会生效。
    exec(db, ["PRAGMA foreign_keys=ON;", "BEGIN;", ...statements, "COMMIT;"].join("\n"));

    const after = rows<Row>(db, "PRAGMA foreign_key_check");
    console.log(`  已写入。迁移后外键违规：${after.length}`);
  }
};

main();