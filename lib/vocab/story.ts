"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ai } from "@/lib/ai";
import { getAiConfig } from "@/lib/ai/actions";
import type { WordStory } from "@/lib/vocab/format";

export type StoryResult = { ok: true; story: WordStory } | { ok: false; error: string };

const STORY_SCHEMA = {
  type: "object",
  properties: {
    en: { type: "string" },
    zh: { type: "string" },
  },
  required: ["en", "zh"],
  additionalProperties: false,
} as const;

const STORY_PROMPT =
  "你是雅思词汇教师。给定一组英文单词，写一个 80-120 词的自然连贯的英文小故事，" +
  "必须自然融入给定的每个单词(可用其任意词形)，情节有趣、适合成人学习者。" +
  "同时给出准确流畅的中文翻译。" +
  "严格只输出符合下面 JSON Schema 的合法 JSON，键名必须是 \"en\"(英文故事) 和 \"zh\"(中文翻译)。" +
  "严禁在字符串值内部使用英文双引号，需要引用时一律改用中文引号「」或单引号。" +
  "不要输出任何解释、前后缀或 markdown 代码围栏。";

type RawStory = Record<string, unknown>;

/** 用一组单词生成 AI 小故事（不落库，供小故事页使用）。 */
export async function generateStory(input: { words: string[] }): Promise<StoryResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };
  const cfg = await getAiConfig(user.id);
  if (!cfg.apiKey) return { ok: false, error: "AI 未配置：请在 设置 → AI 服务 填写 Base URL 和 API Key" };

  const words = [...new Set((input.words ?? []).map((w) => w.trim()).filter(Boolean))].slice(0, 8);
  if (words.length < 2) return { ok: false, error: "至少需要 2 个单词" };

  const provider = ai("text");
  if (!provider.chatJSON) throw new Error(`${provider.name} 不支持结构化输出`);
  const raw = await provider.chatJSON<RawStory>(
    [
      { role: "system", content: STORY_PROMPT },
      { role: "user", content: `单词：${words.join(", ")}` },
    ],
    STORY_SCHEMA,
    { temperature: 0.9, maxTokens: 900, ...cfg },
  );

  const en = String(raw.en ?? raw.story ?? raw.english ?? "").trim();
  const zh = String(raw.zh ?? raw.translation ?? raw.chinese ?? "").trim();
  if (!en) return { ok: false, error: "AI 生成结果缺少英文故事，请重试" };
  return { ok: true, story: { en, zh: zh || "（翻译生成失败）" } };
}

/**
 * 为单个单词生成小故事并持久化到 Word.story（单词详情页用）。
 * 已有故事且未强制时返回缓存。
 */
export async function generateWordStory(input: { wordId: string; force?: boolean }): Promise<StoryResult & { cached?: boolean }> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };
  const cfg = await getAiConfig(user.id);
  if (!cfg.apiKey) return { ok: false, error: "AI 未配置：请在 设置 → AI 服务 填写 Base URL 和 API Key" };

  const word = await prisma.word.findUnique({
    where: { id: input.wordId },
    select: { id: true, spelling: true, story: true },
  });
  if (!word) return { ok: false, error: "单词不存在" };

  if (!input.force && word.story) {
    try {
      const cached = JSON.parse(word.story) as WordStory;
      if (cached.en && cached.zh) return { ok: true, cached: true, story: cached };
    } catch {
      /* 损坏的缓存直接重生成 */
    }
  }

  const provider = ai("text");
  if (!provider.chatJSON) throw new Error(`${provider.name} 不支持结构化输出`);
  const raw = await provider.chatJSON<RawStory>(
    [
      { role: "system", content: STORY_PROMPT.replace("一组英文单词", "一个英文单词") },
      { role: "user", content: `单词：${word.spelling}` },
    ],
    STORY_SCHEMA,
    { temperature: 0.9, maxTokens: 900, ...cfg },
  );

  const en = String(raw.en ?? raw.story ?? raw.english ?? "").trim();
  const zh = String(raw.zh ?? raw.translation ?? raw.chinese ?? "").trim();
  if (!en) return { ok: false, error: "AI 生成结果缺少英文故事，请重试" };

  const story: WordStory = { en, zh: zh || "（翻译生成失败）" };
  await prisma.word.update({ where: { id: word.id }, data: { story: JSON.stringify(story) } });
  revalidatePath(`/vocab/${word.id}`);
  return { ok: true, cached: false, story };
}

export type StoryWordPick =
  | { ok: true; words: { id: string; spelling: string }[] }
  | { ok: false; error: string };

/**
 * 小故事页选词：从错词/生词本/最近学过里抽 count 个词（随机打乱）。
 */
export async function pickStoryWords(input: {
  source: "mistakes" | "favorites" | "recent";
  count: number;
}): Promise<StoryWordPick> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };
  const count = Math.max(3, Math.min(8, Math.round(input.count) || 5));

  const rows =
    input.source === "mistakes"
      ? await prisma.mistakeWord.findMany({
          where: { userId: user.id, mastered: false },
          orderBy: { lastWrongAt: "desc" },
          take: 60,
          select: { word: { select: { id: true, spelling: true } } },
        })
      : input.source === "favorites"
        ? await prisma.favoriteWord.findMany({
            where: { userId: user.id },
            select: { word: { select: { id: true, spelling: true } } },
          })
        : await prisma.vocabProgress.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: "desc" },
            take: 50,
            select: { word: { select: { id: true, spelling: true } } },
          });

  const words = rows.map((r) => ({ id: r.word.id, spelling: r.word.spelling }));
  // Fisher-Yates 洗牌取前 count
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return { ok: true, words: words.slice(0, count) };
}