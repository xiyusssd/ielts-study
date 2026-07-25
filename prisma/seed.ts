/**
 * 数据库 seed 脚本。
 * 使用：pnpm db:seed
 *
 * P2 阶段扩展：从 content/wordlists/*.csv 导入柯林斯词表
 * P4 阶段扩展：seed WritingPrompt / SpeakingPrompt
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 seed 开始...");

  // ---- P0：仅一份烟雾测试样例题目 ----
  const existing = await prisma.writingPrompt.count();
  if (existing === 0) {
    await prisma.writingPrompt.createMany({
      data: [
        {
          task: "task2",
          category: "opinion",
          prompt:
            "Some people believe that university education should be free for everyone, while others argue that students should pay for their own education. Discuss both views and give your own opinion.",
          minWords: 250,
          timeMinutes: 40,
        },
        {
          task: "task2",
          category: "argument",
          prompt:
            "In many countries, more and more young people are leaving school and unable to find jobs after graduation. What problems do you think youth unemployment will cause to the individual and the society? Give reasons and make some suggestions.",
          minWords: 250,
          timeMinutes: 40,
        },
      ],
    });
    console.log("  ✓ 写作题目样本已 seed");
  }

  const speakingCount = await prisma.speakingPrompt.count();
  if (speakingCount === 0) {
    await prisma.speakingPrompt.createMany({
      data: [
        { part: 1, topic: "Hometown", question: "Where is your hometown?" },
        { part: 1, topic: "Hometown", question: "What do you like about your hometown?" },
        { part: 1, topic: "Work / Study", question: "Do you work or are you a student?" },
        { part: 2, topic: "A memorable trip", question: "Describe a trip that you remember well. You should say: where you went, who you went with, what you did there, and explain why it was memorable." },
        { part: 3, topic: "Travel", question: "How has tourism changed in the last twenty years in your country?" },
      ],
    });
    console.log("  ✓ 口语题目样本已 seed");
  }

  console.log("🌱 seed 完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
