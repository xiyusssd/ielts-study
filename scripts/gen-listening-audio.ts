/**
 * 用 OpenAI TTS 为听力 passage 生成 MP3 音频文件。
 * 需要 OPENAI_API_KEY。生成后自动更新 Passage.audioPath。
 *
 * 用法：
 *   tsx scripts/gen-listening-audio.ts [passageId]
 *   （不传 id 则处理所有听力 passage）
 *
 * 输出：content/audio/<source>.mp3
 */
import { PrismaClient } from "@prisma/client";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { openaiProvider } from "../lib/ai/providers/openai";

const prisma = new PrismaClient();

async function main() {
  const targetId = process.argv[2];

  const passages = await prisma.passage.findMany({
    where: {
      module: "listening",
      ...(targetId ? { id: targetId } : {}),
    },
  });
  if (passages.length === 0) {
    console.log("没有找到听力 passage");
    return;
  }

  const audioDir = join(process.cwd(), "content", "audio");
  await mkdir(audioDir, { recursive: true });

  for (const p of passages) {
    console.log(`🎙️  生成 ${p.title}...`);
    const filename = `${p.source}.mp3`;
    const filepath = join(audioDir, filename);
    const relative = `/audio/${filename}`; // 前端通过 Next.js 静态服务访问

    try {
      const audio = await openaiProvider.tts!(p.content, { voice: "alloy", format: "mp3" });
      await writeFile(filepath, audio);
      await prisma.passage.update({
        where: { id: p.id },
        data: { audioPath: relative },
      });
      console.log(`  ✓ ${filename} (${(audio.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error(`  ✗ 失败: ${(e as Error).message.slice(0, 200)}`);
    }
  }
  console.log("✅ 完成。前端会自动优先使用 MP3（若存在），否则用浏览器 TTS。");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
