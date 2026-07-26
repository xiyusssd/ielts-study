"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import {
  vocabBand,
  estimateVocabSize,
  listeningReadingBand,
  writingBand,
  speakingBand,
  overallBand,
  type Bands,
} from "@/lib/scoring/band-mapper";
import type { AssessmentResults, SectionName } from "@/lib/assessment/types";
import { SECTIONS } from "@/lib/assessment/types";
import { getReadingSet, getListeningSet } from "@/lib/assessment/pools/pick";
import { isCorrect } from "@/lib/assessment/pools/types";

/**
 * 拿到用户"当前这一份"评估：总是复用最新一份（不管是否已完成），没有才新建。
 * 这样单独重测某个模块时，是在同一份评估上覆盖更新该模块，不会把其它模块清零。
 * 想从零重测全部，用 startFreshAssessment()。
 */
export async function getOrStartAssessment() {
  const user = (await requireUser())!;
  const latest = await prisma.assessment.findFirst({
    where: { userId: user.id, type: "initial" },
    orderBy: { createdAt: "desc" },
  });
  if (latest) {
    const results = JSON.parse(latest.results) as AssessmentResults;
    return { assessment: latest, results };
  }
  return createEmptyAssessment(user.id);
}

async function createEmptyAssessment(userId: string) {
  const results: AssessmentResults = {
    startedAt: new Date().toISOString(),
    sections: {},
  };
  const created = await prisma.assessment.create({
    data: {
      userId,
      type: "initial",
      results: JSON.stringify(results),
      bands: JSON.stringify({ vocab: 0, listening: 0, reading: 0, writing: 0, speaking: 0 }),
    },
  });
  return { assessment: created, results };
}

/** 从零开始一份全新评估（"重新测全部"入口用），然后回到评估首页。 */
export async function startFreshAssessment() {
  const user = (await requireUser())!;
  await createEmptyAssessment(user.id);
  revalidatePath("/assessment");
  redirect("/assessment");
}

/**
 * 手动填写自己的雅思分数，跳过测试。
 * 把 5 维分数直接写成一份完整评估（标记 manual），设 completedAt，同步 profile，进报告。
 */
export async function submitManualBands(payload: {
  vocab: number;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}) {
  const { assessment, results } = await getOrStartAssessment();
  const now = new Date().toISOString();
  const clamp = (n: number) => Math.max(0, Math.min(9, Math.round(n * 2) / 2));
  for (const s of SECTIONS) {
    const score = clamp(Number(payload[s]) || 0);
    results.sections[s] = {
      submittedAt: now,
      answers: {} as never,
      score,
      raw: { manual: true },
    };
  }
  await persist(assessment.id, assessment.userId, results);
  revalidatePath("/");
  redirect("/assessment/report");
}

/** 提交词汇部分（收下发的题目规格 + 答案，服务端按规格重判分）*/
type VocabSpecItem = { id: string; level: number; answer: number; word: string; meaning: string };
export async function submitVocab(payload: {
  spec: VocabSpecItem[];
  answers: Record<string, number>;
}) {
  const { spec, answers } = payload;
  const { assessment, results } = await getOrStartAssessment();
  const byLevel: Record<number, { correct: number; total: number }> = {};
  // 逐词回顾：单词 + 真实释义 + 对错（结果页展示，让用户知道每个词什么意思）
  const review: {
    word: string;
    meaning: string;
    level: number;
    ok: boolean;
    answered: boolean;
  }[] = [];
  for (const item of spec) {
    byLevel[item.level] ??= { correct: 0, total: 0 };
    byLevel[item.level].total++;
    const answered = item.id in answers;
    const ok = answers[item.id] === item.answer;
    if (ok) byLevel[item.level].correct++;
    review.push({ word: item.word, meaning: item.meaning, level: item.level, ok, answered });
  }
  const groups = Object.entries(byLevel).map(([k, v]) => ({ level: Number(k), ...v }));
  const band = vocabBand(groups);
  const size = estimateVocabSize(groups);
  const rawStr: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers)) rawStr[k] = String(v);
  results.sections.vocab = {
    submittedAt: new Date().toISOString(),
    answers: rawStr,
    score: band,
    raw: { byLevel, size: size.size, sizeLow: size.low, sizeHigh: size.high, review },
  };
  await persist(assessment.id, assessment.userId, results);
  redirect("/assessment/vocab/result");
}

/** 提交听力（按抽中题集 value 判分）*/
export async function submitListening(payload: { poolId: string; answers: Record<string, string> }) {
  const { poolId, answers } = payload;
  const { assessment, results } = await getOrStartAssessment();
  const set = getListeningSet(poolId);
  const questions = set?.questions ?? [];
  let correct = 0;
  for (const q of questions) if (isCorrect(answers[q.id], q.answer, q.accept)) correct++;
  const band = listeningReadingBand(correct, questions.length);
  results.sections.listening = {
    submittedAt: new Date().toISOString(),
    answers,
    score: band,
    raw: { correct, total: questions.length, poolId },
  };
  await persist(assessment.id, assessment.userId, results);
  redirect("/assessment/listening/result");
}

/** 提交阅读（按抽中题集 value 判分）*/
export async function submitReading(payload: { poolId: string; answers: Record<string, string> }) {
  const { poolId, answers } = payload;
  const { assessment, results } = await getOrStartAssessment();
  const set = getReadingSet(poolId);
  const questions = set?.questions ?? [];
  let correct = 0;
  for (const q of questions) if (isCorrect(answers[q.id], q.answer, q.accept)) correct++;
  const band = listeningReadingBand(correct, questions.length);
  results.sections.reading = {
    submittedAt: new Date().toISOString(),
    answers,
    score: band,
    raw: { correct, total: questions.length, poolId },
  };
  await persist(assessment.id, assessment.userId, results);
  redirect("/assessment/reading/result");
}

/** 提交写作（需要 AI 批改，若无 key 则给 5.5 默认分并标记） */
export async function submitWriting(payload: { content: string; wordCount: number; duration: number }) {
  const { assessment, results } = await getOrStartAssessment();
  const { getEnv, providerReady } = await import("@/lib/env");
  const env = getEnv();

  let scores = { tr: 5.5, cc: 5.5, lr: 5.5, gra: 5.5 };
  let feedback = "AI 批改暂未启用（未配置 API Key），此分数为占位。";
  let usedAI = false;

  if (providerReady("text") && env.OPENAI_API_KEY) {
    try {
      const { gradeWriting } = await import("@/lib/ai/writing-grader");
      const graded = await gradeWriting({ prompt: "assessment writing task", content: payload.content });
      scores = graded.scores;
      feedback = graded.feedback;
      usedAI = true;
    } catch (e) {
      feedback = `AI 批改失败：${(e as Error).message.slice(0, 200)}`;
    }
  }

  const band = writingBand(scores);
  results.sections.writing = {
    submittedAt: new Date().toISOString(),
    answers: payload,
    score: band,
    raw: { scores, feedback, usedAI },
  };
  await persist(assessment.id, assessment.userId, results);
  redirect("/assessment/speaking");
}

/** 提交口语（同样支持无 key 降级） */
export async function submitSpeaking(payload: { transcript: string; skipped?: boolean }) {
  const { assessment, results } = await getOrStartAssessment();
  const { providerReady } = await import("@/lib/env");

  let scores = { fluency: 5.5, vocabulary: 5.5, grammar: 5.5, pronunciation: 5.5 };
  let feedback = payload.skipped
    ? "已跳过口语测试。规划中口语项将使用默认起点 5.5。"
    : "AI 评分暂未启用（未配置 API Key），此分数为占位。";
  let usedAI = false;

  if (!payload.skipped && providerReady("text") && payload.transcript.trim()) {
    try {
      const { gradeSpeaking } = await import("@/lib/ai/speaking-grader");
      const graded = await gradeSpeaking({ transcript: payload.transcript });
      scores = graded.scores;
      feedback = graded.feedback;
      usedAI = true;
    } catch (e) {
      feedback = `AI 评分失败：${(e as Error).message.slice(0, 200)}`;
    }
  }

  const band = payload.skipped ? 5.5 : speakingBand(scores);
  results.sections.speaking = {
    submittedAt: new Date().toISOString(),
    answers: payload,
    score: band,
    raw: { scores, feedback, usedAI },
  };
  await persist(assessment.id, assessment.userId, results);
  revalidatePath("/");
  redirect("/assessment/report");
}

/**
 * 落盘一段结果：重算 bands、5 段齐全则补 completedAt、同步 profile.currentBand。
 * 任何模块（含重测）提交后都会刷新 profile，保证首页/报告用的是最新分数。
 */
async function persist(assessmentId: string, userId: string, results: AssessmentResults) {
  const allDone = SECTIONS.every((s) => results.sections[s]?.submittedAt);
  if (allDone && !results.completedAt) results.completedAt = new Date().toISOString();
  const bands = computeBands(results);
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      results: JSON.stringify(results),
      bands: JSON.stringify(bands),
    },
  });
  await prisma.profile.update({
    where: { userId },
    data: { currentBand: JSON.stringify(bands) },
  });
}

function computeBands(results: AssessmentResults): Bands & { overall: number } {
  const b: Bands = {
    vocab: results.sections.vocab?.score ?? 0,
    listening: results.sections.listening?.score ?? 0,
    reading: results.sections.reading?.score ?? 0,
    writing: results.sections.writing?.score ?? 0,
    speaking: results.sections.speaking?.score ?? 0,
  };
  const overall = b.listening && b.reading && b.writing && b.speaking
    ? overallBand({
        listening: b.listening, reading: b.reading, writing: b.writing, speaking: b.speaking,
      })
    : 0;
  return { ...b, overall };
}

/** 下一节：查看当前进度决定跳到哪 */
export async function nextSection(): Promise<SectionName | "report"> {
  const { results } = await getOrStartAssessment();
  for (const s of SECTIONS) {
    if (!results.sections[s]?.submittedAt) return s;
  }
  return "report";
}
