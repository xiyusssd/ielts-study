import { prisma } from "@/lib/db";

/**
 * 一次扫表算出多个标签各自的词数。
 *
 * 词汇首页要展示 8 个词汇书 + 12 个雅思话题的覆盖量，原先每个标签一条
 * `COUNT(*) WHERE tags LIKE '%x%'`（tags 无索引）= 20 次全表扫；
 * 这里合并成一条 SQL 里的 20 个 SUM(CASE ...)，只扫一遍。
 *
 * 匹配口径与 `prisma.word.count({ where: { tags: { contains } } })` 保持一致（子串匹配），
 * 免得首页数字和实际抽词范围对不上。
 */
export async function countWordsByTag(tags: string[]): Promise<Record<string, number>> {
  if (tags.length === 0) return {};
  const cols = tags.map((_, i) => `SUM(CASE WHEN tags LIKE '%' || ? || '%' THEN 1 ELSE 0 END) AS t${i}`).join(", ");
  const rows = await prisma.$queryRawUnsafe<Record<string, number | bigint>[]>(
    `SELECT ${cols} FROM Word`,
    ...tags,
  );
  const row = rows[0] ?? {};
  const out: Record<string, number> = {};
  tags.forEach((tag, i) => {
    out[tag] = Number(row[`t${i}`] ?? 0);
  });
  return out;
}