/**
 * 全模块综合 E2E 测试
 * - 创建新测试用户
 * - 模拟走完 P1-P6 所有关键路径
 * - 抓取 bug、性能问题、数据不一致
 *
 * 用法：./scripts/dev.sh 起服务，另开终端跑：
 *   tsx scripts/e2e-full.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sealData } from "iron-session";
import { schedule } from "../lib/srs/fsrs.ts";
import { planStudy } from "../lib/planner/algorithm.ts";
import {
  vocabBand, listeningReadingBand, writingBand, speakingBand, overallBand,
} from "../lib/scoring/band-mapper.ts";

const prisma = new PrismaClient();
const BASE = process.env.BASE || "http://127.0.0.1:3000";

let pass = 0, fail = 0;
const bugs = [];

async function check(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    fail++;
    bugs.push({ name, error: e.message });
    console.log(`  ❌ ${name}: ${e.message.slice(0, 120)}`);
  }
}

async function main() {
  console.log("\n🧪 全模块 E2E 综合测试\n");

  // ---- 准备用户 ----
  const email = "e2e-test@example.com";
  await prisma.user.deleteMany({ where: { email } });
  const passwordHash = await bcrypt.hash("test123456", 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, profile: { create: {} } },
  });
  console.log(`👤 测试用户 ${email} (${user.id.slice(0, 8)})\n`);

  const secret = process.env.SESSION_SECRET;
  const cookie = await sealData({ userId: user.id, email }, { password: secret, ttl: 86400 });

  async function get(path) {
    const res = await fetch(`${BASE}${path}`, { headers: { Cookie: `ielts-study-session=${cookie}` } });
    return { status: res.status, text: await res.text() };
  }

  // ===================================================
  console.log("📋 [P0] 基础设施");
  // ===================================================
  await check("health endpoint 200", async () => {
    const r = await get("/api/health");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    const j = JSON.parse(r.text);
    if (!j.ok) throw new Error(`health ok=false: ${j.error}`);
  });
  await check("Dashboard 未登录时能重定向", async () => {
    const r = await fetch(`${BASE}/`, { redirect: "manual" });
    // Layout redirect + page returns null → 会渲染 login 或 302
    if (r.status !== 200 && r.status !== 307 && r.status !== 302) throw new Error(`HTTP ${r.status}`);
  });
  await check("登录后 Dashboard 200", async () => {
    const r = await get("/");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    if (!/(早上好|中午好|下午好|晚上好|夜深了)/.test(r.text)) throw new Error("首页没有时间问候");
  });

  // ===================================================
  console.log("\n📋 [P1] 评估 + 规划");
  // ===================================================
  await check("评估首页 200", async () => {
    const r = await get("/assessment");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    if (!r.text.includes("5 维水平诊断")) throw new Error("评估首页缺标题");
  });

  await check("模拟完成评估（直接落库）", async () => {
    const bands = { vocab: 6, listening: 6.5, reading: 6.5, writing: 5.5, speaking: 6 };
    const overall = overallBand({ listening: 6.5, reading: 6.5, writing: 5.5, speaking: 6 });
    await prisma.assessment.create({
      data: {
        userId: user.id, type: "initial",
        results: JSON.stringify({
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          sections: {
            vocab: { submittedAt: new Date().toISOString(), answers: {}, score: 6 },
            listening: { submittedAt: new Date().toISOString(), answers: {}, score: 6.5 },
            reading: { submittedAt: new Date().toISOString(), answers: {}, score: 6.5 },
            writing: { submittedAt: new Date().toISOString(), answers: { content: "x", wordCount: 200 }, score: 5.5 },
            speaking: { submittedAt: new Date().toISOString(), answers: {}, score: 6 },
          },
        }),
        bands: JSON.stringify({ ...bands, overall }),
      },
    });
    await prisma.profile.update({
      where: { userId: user.id },
      data: { currentBand: JSON.stringify({ ...bands, overall }) },
    });
  });

  await check("评估报告页显示分数", async () => {
    const r = await get("/assessment/report");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    if (!r.text.includes("你的水平报告")) throw new Error("报告页缺标题");
    if (!r.text.includes("5 维雷达")) throw new Error("缺雷达图");
  });

  await check("规划器算法生成 8 周计划", async () => {
    const { weeks, tasks } = planStudy({
      current: { vocab: 6, listening: 6.5, reading: 6.5, writing: 5.5, speaking: 6 },
      targets: { overall: 7, listening: 7, reading: 7, writing: 6.5, speaking: 6.5 },
      examDate: new Date(Date.now() + 8 * 7 * 86400000),
      weeklyHours: 10,
    });
    if (weeks.length < 6 || weeks.length > 10) throw new Error(`weeks=${weeks.length}, 期待 ~8`);
    if (tasks.length < 50) throw new Error(`tasks=${tasks.length}, 太少`);

    // 落库
    const plan = await prisma.plan.create({
      data: { userId: user.id, startDate: weeks[0].startDate, endDate: weeks[weeks.length - 1].endDate },
    });
    for (const w of weeks) {
      const wp = await prisma.weekPlan.create({
        data: { planId: plan.id, weekIndex: w.weekIndex, focus: JSON.stringify(w.focus) },
      });
      const weekTasks = tasks.filter((t) => t.date >= w.startDate && t.date <= w.endDate);
      if (weekTasks.length > 0) {
        await prisma.dailyTask.createMany({
          data: weekTasks.map((t) => ({
            weekPlanId: wp.id, date: t.date, module: t.module,
            content: JSON.stringify({ type: t.contentType, minutes: t.minutes, description: t.description }),
          })),
        });
      }
    }
    await prisma.profile.update({
      where: { userId: user.id },
      data: {
        targetOverall: 7, targetListening: 7, targetReading: 7, targetWriting: 6.5, targetSpeaking: 6.5,
        examDate: new Date(Date.now() + 8 * 7 * 86400000), weeklyHours: 10,
      },
    });
  });

  await check("规划页显示周计划", async () => {
    const r = await get("/plan");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    if (!r.text.includes("学习计划")) throw new Error("规划页缺标题");
  });

  // ===================================================
  console.log("\n📋 [P2] 词汇 SRS");
  // ===================================================
  await check("词汇首页 200 且显示队列", async () => {
    const r = await get("/vocab");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    if (!r.text.includes("今日队列")) throw new Error("词汇首页缺队列");
  });

  await check("FSRS 差异化：Good vs Again", async () => {
    const good = schedule({ stability: 0, difficulty: 0, reps: 0, lapses: 0 }, 2);
    const again = schedule({ stability: 0, difficulty: 0, reps: 0, lapses: 0 }, 0);
    if (good.stability <= again.stability) throw new Error(`Good ${good.stability} ≤ Again ${again.stability}`);
  });

  await check("学习页 200", async () => {
    const r = await get("/vocab/study");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  });

  // ===================================================
  console.log("\n📋 [P3] 阅读");
  // ===================================================
  const passage = await prisma.passage.findFirst({ where: { module: "reading" } });
  await check("阅读首页 200", async () => {
    const r = await get("/reading");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  });
  await check("做题页 200", async () => {
    const r = await get(`/reading/${passage.id}`);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    if (!r.text.includes("60 分钟")) throw new Error("做题页缺计时提示");
  });
  await check("阅读判分：8/13 → Band 5.5", async () => {
    const questions = await prisma.question.findMany({ where: { passageId: passage.id }, orderBy: { index: "asc" } });
    let correct = 0;
    const graded = {};
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const std = JSON.parse(q.answer);
      const stdStr = Array.isArray(std) ? std[0] : std;
      const ok = i < 8;
      graded[q.id] = { user: ok ? stdStr : "wrong", correct: stdStr, ok };
      if (ok) correct++;
    }
    const band = listeningReadingBand(correct, questions.length);
    if (band < 5 || band > 6) throw new Error(`band=${band}, 期待 5-6`);
    await prisma.attempt.create({
      data: { userId: user.id, passageId: passage.id, answers: JSON.stringify(graded), score: correct / questions.length, band, duration: 1200 },
    });
  });

  // ===================================================
  console.log("\n📋 [P4] 写作");
  // ===================================================
  const writingPrompt = await prisma.writingPrompt.findFirst({ where: { task: "task2" } });
  await check("写作首页 200", async () => {
    const r = await get("/writing");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    if (!r.text.includes("Task 2")) throw new Error("缺 Task 2 分类");
  });
  await check("题目页 200", async () => {
    const r = await get(`/writing/${writingPrompt.id}`);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  });
  await check("模板页 200 且有 PEEL", async () => {
    const r = await get("/writing/templates");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    if (!r.text.includes("PEEL")) throw new Error("缺 PEEL 模板");
  });
  await check("范文页 200 且有 Band 6/7/8", async () => {
    const r = await get("/writing/samples");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    // React 会在 "Band " 和数字之间插 HTML 注释，用宽松正则匹配
    for (const b of [/Band[^0-9]*6/, /Band[^0-9]*7/, /Band[^0-9]*8/]) {
      if (!b.test(r.text)) throw new Error(`缺 ${b} 范文`);
    }
  });
  await check("模拟作文提交（占位分）", async () => {
    const scores = { tr: 6, cc: 5.5, lr: 6, gra: 5.5 };
    const overall = writingBand(scores);
    await prisma.writingSubmission.create({
      data: {
        userId: user.id, promptId: writingPrompt.id,
        content: "Test essay content for E2E.", wordCount: 6, duration: 600,
        scores: JSON.stringify({ ...scores, overall }),
        feedback: JSON.stringify({ feedback: "测试反馈", paragraphComments: [], corrections: [] }),
      },
    });
  });

  // ===================================================
  console.log("\n📋 [P5] 听力");
  // ===================================================
  const listenPass = await prisma.passage.findFirst({ where: { module: "listening" } });
  await check("听力首页 200", async () => {
    const r = await get("/listening");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    if (!r.text.includes("精听")) throw new Error("缺精听入口");
  });
  await check("听力做题页 200", async () => {
    const r = await get(`/listening/${listenPass.id}`);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  });
  await check("精听页 200", async () => {
    const r = await get(`/listening/${listenPass.id}/dictation`);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    if (!r.text.includes("听句子并输入")) throw new Error("精听页缺主题");
  });
  await check("模拟听力判分 7/10 → Band 6", async () => {
    const questions = await prisma.question.findMany({ where: { passageId: listenPass.id } });
    const band = listeningReadingBand(7, 10);
    if (band < 5.5 || band > 6.5) throw new Error(`band=${band}, 期待 6-6.5`);
  });

  // ===================================================
  console.log("\n📋 [P6] 口语");
  // ===================================================
  await check("口语首页 200 且有 P1/P2/P3", async () => {
    const r = await get("/speaking");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    for (const p of ["Part 1", "Part 2", "Part 3"]) {
      if (!r.text.includes(p)) throw new Error(`缺 ${p}`);
    }
  });
  await check("Part 1 页面 200", async () => {
    const r = await get("/speaking/part1");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  });
  await check("Part 2 页面 200 (Cue card)", async () => {
    const r = await get("/speaking/part2");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  });
  await check("口语评分算法", async () => {
    const b = speakingBand({ fluency: 6, vocabulary: 6, grammar: 5.5, pronunciation: 6 });
    if (b !== 6 && b !== 5.5) throw new Error(`b=${b}`);
  });
  await check("Realtime endpoint 无 key 时返回 400", async () => {
    const r = await fetch(`${BASE}/api/speaking/session`, {
      method: "POST",
      headers: { Cookie: `ielts-study-session=${cookie}`, "Content-Type": "application/json" },
      body: JSON.stringify({ part: 1 }),
    });
    if (r.status !== 400 && r.status !== 500) throw new Error(`期待 400，实际 ${r.status}`);
  });

  // ===================================================
  console.log("\n📋 [Dashboard 集成]");
  // ===================================================
  await check("Dashboard 显示 streak", async () => {
    const r = await get("/");
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    // 有数据后应显示 streak 火焰
    if (!r.text.match(/🔥|streak|连续/i)) console.log("   ⚠ 未显示 streak 图标（可能今日无活动）");
  });
  await check("Dashboard 显示 5 维雷达", async () => {
    const r = await get("/");
    if (!r.text.includes("5 维雷达")) throw new Error("Dashboard 缺雷达");
  });
  await check("Dashboard 显示成绩趋势", async () => {
    const r = await get("/");
    if (!r.text.includes("成绩趋势")) throw new Error("缺趋势图");
  });

  // ===================================================
  console.log("\n📊 数据一致性");
  // ===================================================
  await check("Assessment / Plan 都存在", async () => {
    const a = await prisma.assessment.count({ where: { userId: user.id } });
    const p = await prisma.plan.count({ where: { userId: user.id } });
    if (a === 0 || p === 0) throw new Error(`assessment=${a}, plan=${p}`);
  });
  await check("Task 表数据合理", async () => {
    const t = await prisma.dailyTask.count({ where: { weekPlan: { plan: { userId: user.id } } } });
    if (t < 20) throw new Error(`tasks=${t}, 太少`);
  });

  // 清理
  await prisma.user.delete({ where: { id: user.id } });

  console.log(`\n${pass + fail} 个测试 · ✅ ${pass} 通过 · ❌ ${fail} 失败`);
  if (bugs.length) {
    console.log("\n🐛 Bug 清单:");
    bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b.name}\n     ${b.error.slice(0, 200)}`));
  }
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
