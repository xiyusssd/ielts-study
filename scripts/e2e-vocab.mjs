/**
 * P2 端到端测试：seed → 队列生成 → 模拟复习 → 检查 dueAt 变化
 */
import { PrismaClient } from "@prisma/client";
import { schedule } from "../lib/srs/fsrs.ts";
import { generateDailyQueue } from "../lib/srs/queue.ts";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "test@example.com" } });
  if (!user) throw new Error("no test user");

  console.log("👤", user.email);

  // 清旧
  await prisma.vocabProgress.deleteMany({ where: { userId: user.id } });

  // 1. 生成初始队列
  const q1 = await generateDailyQueue(user.id, { newLimit: 5, reviewLimit: 100, targetLevel: 5000 });
  console.log(`📋 队列1: 到期 ${q1.dueList.length}，新词 ${q1.newList.length}`);
  if (q1.newList.length !== 5) throw new Error("newLimit 未生效");

  // 2. 模拟对第一个词 "Good" 评分
  const w0 = q1.newList[0];
  const r0 = schedule(
    { stability: 0, difficulty: 0, reps: 0, lapses: 0 },
    2,
  );
  await prisma.vocabProgress.create({
    data: {
      userId: user.id,
      wordId: w0.word.id,
      stability: r0.stability,
      difficulty: r0.difficulty,
      reps: 1,
      lapses: 0,
      dueAt: r0.dueAt,
      lastGrade: 2,
    },
  });
  console.log(`✅ 复习 "${w0.word.spelling}"，Good，下次到期 ${r0.dueAt.toLocaleDateString()}（+${r0.intervalDays} 天）`);
  if (r0.intervalDays < 1) throw new Error("Good 至少应+1天");

  // 3. 模拟另一个词 "Again"（错误）
  const w1 = q1.newList[1];
  const r1 = schedule(
    { stability: 0, difficulty: 0, reps: 0, lapses: 0 },
    0,
  );
  await prisma.vocabProgress.create({
    data: {
      userId: user.id,
      wordId: w1.word.id,
      stability: r1.stability,
      difficulty: r1.difficulty,
      reps: 1,
      lapses: 1,
      dueAt: r1.dueAt,
      lastGrade: 0,
    },
  });
  console.log(`❌ 复习 "${w1.word.spelling}"，Again，下次到期 ${r1.dueAt.toLocaleDateString()}（+${r1.intervalDays} 天）`);

  // 4. 再生成队列，应看到 3 个仍是新词（原 5 - 2 已学）
  const q2 = await generateDailyQueue(user.id, { newLimit: 5, reviewLimit: 100 });
  console.log(`📋 队列2: 到期 ${q2.dueList.length}，新词 ${q2.newList.length}`);

  // 5. 检查 SRS 状态区分度
  const progresses = await prisma.vocabProgress.findMany({ where: { userId: user.id }, include: { word: true } });
  console.log("\n📊 SRS 状态：");
  for (const p of progresses) {
    console.log(`   ${p.word.spelling}: S=${p.stability.toFixed(2)} D=${p.difficulty.toFixed(1)} reps=${p.reps} lapses=${p.lapses}`);
  }

  // 首次评级两词都会在次日复习（FSRS 冷启动策略）。
  // 差异体现在 stability（长期记忆强度）：Good 明显 > Again
  if (r0.stability <= r1.stability) {
    throw new Error(`FSRS bug: Good stability ${r0.stability} 应 > Again ${r1.stability}`);
  }
  console.log(`\n✅ FSRS 正常：Good stability ${r0.stability.toFixed(2)} > Again ${r1.stability.toFixed(2)}`);

  // 模拟第二次复习（假设已过一段时间），看差异是否扩大
  const r0b = schedule({ stability: r0.stability, difficulty: r0.difficulty, reps: 1, lapses: 0 }, 2);
  const r1b = schedule({ stability: r1.stability, difficulty: r1.difficulty, reps: 1, lapses: 1 }, 2);
  console.log(`   第二次 Good 后：achieve +${r0b.intervalDays}天  vs  avoid +${r1b.intervalDays}天`);
  if (r0b.intervalDays <= r1b.intervalDays) {
    throw new Error("第二次复习后间隔差异应更大");
  }
  console.log("✅ 长期间隔差异符合预期");

  await prisma.$disconnect();
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
