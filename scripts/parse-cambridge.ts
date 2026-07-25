/**
 * 剑桥雅思 PDF 解析（P3 阶段基础版）
 *
 * 用法：
 *   tsx scripts/parse-cambridge.ts content/cambridge-pdfs/cam17.pdf
 *
 * 输出：content/parsed/<basename>.json （手动校对后可用 import-content.ts 入库）
 *
 * ⚠️ 剑桥真题排版不统一，脚本采用启发式解析：
 * - 页眉/页脚过滤
 * - Passage 边界识别（"READING PASSAGE N" / "Questions N-M"）
 * - 题号识别（^\d+\s+）
 * 建议解析后打开 JSON 手动检查/修正后再入库。
 *
 * 本脚本目前仅提供框架 — 需要 pdf-parse 依赖，运行时会检测。
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { existsSync } from "node:fs";

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("用法: tsx scripts/parse-cambridge.ts <path/to/cam17.pdf>");
    process.exit(1);
  }
  if (!existsSync(pdfPath)) {
    console.error(`❌ 文件不存在: ${pdfPath}`);
    process.exit(1);
  }

  let pdfParse: (buf: Buffer) => Promise<{ text: string }>;
  try {
    // @ts-expect-error dynamic import of optional peer
    const mod = await import("pdf-parse");
    pdfParse = mod.default ?? mod;
  } catch {
    console.error("❌ 未安装 pdf-parse。运行：pnpm add -D pdf-parse");
    console.error("   (P3 基础版可先跳过 PDF 解析，直接用 seed / AI 生成的题目)");
    process.exit(1);
  }

  const buf = await readFile(pdfPath);
  const { text } = await pdfParse(buf);

  // 简单分块：按 "READING PASSAGE" 切
  const chunks = text.split(/READING PASSAGE\s+\d+/i).slice(1);
  console.log(`📖 检测到 ${chunks.length} 篇 passage`);

  const parsed = chunks.map((chunk, i) => ({
    index: i + 1,
    title: extractTitle(chunk),
    content: extractContent(chunk),
    // 题目解析需要更多启发式，这里只提取原文，题目 TODO
    rawText: chunk.slice(0, 3000),
  }));

  const outDir = join(process.cwd(), "content", "parsed");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${basename(pdfPath, ".pdf")}.json`);
  await writeFile(outPath, JSON.stringify(parsed, null, 2), "utf-8");
  console.log(`✅ 已写出 ${outPath}`);
  console.log(`   请打开手动补充题目结构后再 import。`);
}

function extractTitle(chunk: string): string {
  // 取第一行非空
  const lines = chunk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines[0]?.slice(0, 200) ?? "Untitled";
}

function extractContent(chunk: string): string {
  // 去掉 "Questions N-M" 之后的题目部分
  const idx = chunk.search(/Questions\s+\d+[-–]\d+/i);
  if (idx > 0) return chunk.slice(0, idx).trim();
  return chunk.trim();
}

main().catch((e) => { console.error(e); process.exit(1); });
