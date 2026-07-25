/**
 * P1 端到端测试脚本
 * 直接调用 Prisma 模拟完成一次完整评估 + 生成计划
 */

import { PrismaClient } from "@prisma/client";
import { VOCAB_QUESTIONS, READING_QUESTIONS, LISTENING_QUESTIONS } from "../lib/assessment/seed-data.ts";
import { planStudy } from "../lib/planner/algorithm.ts";
import { vocabBand, listeningReadingBand, writingBand, speakingBand, overallBand } from "../lib/scoring/band-mapper.ts";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "test@example.com" } });
  if (!user) throw new Error("test user not found");

  console.log("👤 用户:", user.email);

  // 模拟评估：假设用户在各维度表现中等（正确率 ~65%）
  const vocabAnswers = {};
  for (const q of VOCAB_QUESTIONS) {
    // 3000 级全对，5000 大部分对，7000 一半，8500 少量
    const correct =
      q.level === 3000 ? true :
      q.level === 5000 ? Math.random() > 0.15 :
      q.level === 7000 ? Math.random() > 0.5 :
      Math.random() > 0.7;
    vocabAnswers[q.id] = correct ? q.answer : (q.answer + 1) % 4;
  }
  const byLevel = {};
  for (const q of VOCAB_QUESTIONS) {
    byLevel[q.level] ??= { correct: 0, total: 0 };
    byLevel[q.level].total++;
    if (vocabAnswers[q.id] === q.answer) byLevel[q.level].correct++;
  }
  const vocabScore = vocabBand(Object.entries(byLevel).map(([l, v]) => ({ level: +l, ...v })));

  const listeningAnswers = {};
  let listenCorrect = 0;
  for (const q of LISTENING_QUESTIONS) {
    const good = Math.random() > 0.35;
    listeningAnswers[q.id] = good ? q.answer : "wrong";
    if (good) listenCorrect++;
  }
  const listeningScore = listeningReadingBand(listenCorrect, LISTENING_QUESTIONS.length);

  const readingAnswers = {};
  let readCorrect = 0;
  for (const q of READING_QUESTIONS) {
    const good = Math.random() > 0.4;
    readingAnswers[q.id] = good ? q.answer : "wrong";
    if (good) readCorrect++;
  }
  const readingScore = listeningReadingBand(readCorrect, READING_QUESTIONS.length);

  const writingCriteria = { tr: 6, cc: 5.5, lr: 5.5, gra: 5.5 };
  const writingScore = writingBand(writingCriteria);

  const speakingCriteria = { fluency: 5.5, vocabulary: 5.5, grammar: 5, pronunciation: 6 };
  const speakingScore = speakingBand(speakingCriteria);

  const bands = {
    vocab: vocabScore,
    listening: listeningScore,
    reading: readingScore,
    writing: writingScore,
    speaking: speakingScore,
    overall: overallBand({
      listening: listeningScore, reading: readingScore, writing: writingScore, speaking: speakingScore,
    }),
  };
  console.log("📊 评估结果:", bands);

  // 清旧数据
  await prisma.assessment.deleteMany({ where: { userId: user.id } });
  await prisma.plan.deleteMany({ where: { userId: user.id } });

  // 落 assessment
  const results = {
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    sections: {
      vocab: { submittedAt: new Date().toISOString(), answers: vocabAnswers, score: vocabScore },
      listening: { submittedAt: new Date().toISOString(), answers: listeningAnswers, score: listeningScore },
      reading: { submittedAt: new Date().toISOString(), answers: readingAnswers, score: readingScore },
      writing: { submittedAt: new Date().toISOString(), answers: { content: "sample essay", wordCount: 220, duration: 800 }, score: writingScore },
      speaking: { submittedAt: new Date().toISOString(), answers: { transcript: "sample transcript" }, score: speakingScore },
    },
  };
  await prisma.assessment.create({
    data: {
      userId: user.id,
      type: "initial",
      results: JSON.stringify(results),
      bands: JSON.stringify(bands),
    },
  });
  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, currentBand: JSON.stringify(bands) },
    update: { currentBand: JSON.stringify(bands) },
  });
  console.log("✅ Assessment 落库");

  // 生成 plan
  const { weeks, tasks } = planStudy({
    current: bands,
    targets: { overall: 7, listening: 7, reading: 7, writing: 6.5, speaking: 6.5 },
    examDate: new Date(Date.now() + 8 * 7 * 24 * 3600 * 1000),
    weeklyHours: 10,
  });
  console.log("📅 计划:", weeks.length, "周,", tasks.length, "任务");

  await prisma.profile.update({
    where: { userId: user.id },
    data: {
      targetOverall: 7,
      targetListening: 7,
      targetReading: 7,
      targetWriting: 6.5,
      targetSpeaking: 6.5,
      examDate: new Date(Date.now() + 8 * 7 * 24 * 3600 * 1000),
      weeklyHours: 10,
    },
  });

  const plan = await prisma.plan.create({
    data: { userId: user.id, startDate: weeks[0].startDate, endDate: weeks[weeks.length - 1].endDate },
  });
  for (const w of weeks) {
    const wp = await prisma.weekPlan.create({
      data: { planId: plan.id, weekIndex: w.weekIndex, focus: JSON.stringify(w.focus) },
    });
    const weekTasks = tasks.filter(
      (t) => t.date >= w.startDate && t.date <= w.endDate,
    );
    if (weekTasks.length) {
      await prisma.dailyTask.createMany({
        data: weekTasks.map((t) => ({
          weekPlanId: wp.id,
          date: t.date,
          module: t.module,
          content: JSON.stringify({ type: t.contentType, minutes: t.minutes, description: t.description }),
        })),
      });
    }
  }
  console.log("✅ Plan 落库");

  // 汇总
  const [wc, tc, todayTasks] = await Promise.all([
    prisma.weekPlan.count({ where: { planId: plan.id } }),
    prisma.dailyTask.count({ where: { weekPlan: { planId: plan.id } } }),
    prisma.dailyTask.count({
      where: {
        weekPlan: { planId: plan.id },
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);
  console.log("📊 DB 状态: weekPlans =", wc, ", tasks =", tc, ", 今日之后 =", todayTasks);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
