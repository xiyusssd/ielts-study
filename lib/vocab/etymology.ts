"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ai } from "@/lib/ai";
import { getAiConfig } from "@/lib/ai/actions";
import type { Derivative, EtymologyPart } from "@/lib/vocab/format";

export type EnrichData = {
  defEn: string;
  etymology: EtymologyPart[];
  derivatives: Derivative[];
  mnemonic: string;
};

export type EnrichResult =
  | { ok: true; cached: boolean; data: EnrichData }
  | { ok: false; error: string };

const ENRICH_SCHEMA = {
  type: "object",
  properties: {
    defEn: { type: "string" },
    etymology: {
      type: "array",
      items: {
        type: "object",
        properties: { part: { type: "string" }, meaning: { type: "string" } },
        required: ["part", "meaning"],
        additionalProperties: false,
      },
    },
    derivatives: {
      type: "array",
      items: {
        type: "object",
        properties: { word: { type: "string" }, pos: { type: "string" }, meaning: { type: "string" } },
        required: ["word", "pos", "meaning"],
        additionalProperties: false,
      },
    },
    mnemonic: { type: "string" },
  },
  required: ["defEn", "etymology", "derivatives", "mnemonic"],
  additionalProperties: false,
} as const;

const ENRICH_PROMPT =
  "你是雅思词汇教学专家。给定一个英文单词和它的中文释义，请生成四个维度的学习材料：" +
  "1) defEn：简洁准确的英文释义(5-15词)；" +
  "2) etymology：词根词缀拆解，每个词根给出含义，最多3个；" +
  "3) derivatives：该词的常用派生词2-4个(词形、词性、中文)；" +
  "4) mnemonic：一条中文助记，利用发音/词形/联想帮助记忆(20-40字)。" +
  "所有内容必须基于该词的常见含义，不要编造词源。" +
  "严格只输出符合下面 JSON Schema 的合法 JSON，键名必须完全一致，不要增删键。" +
  "严禁在字符串值内部使用英文双引号，需要引用时一律改用中文引号「」或单引号。" +
  "不要输出任何解释、前后缀或 markdown 代码围栏。";

/**
 * 为单词生成/刷新 AI 富化字段（英文释义/词根词缀/派生词/助记），持久化到 Word。
 * 已有内容且未强制时直接返回缓存。
 */
export async function enrichWord(input: { wordId: string; force?: boolean }): Promise<EnrichResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };
  const cfg = await getAiConfig(user.id);
  if (!cfg.apiKey) return { ok: false, error: "AI 未配置：请在 设置 → AI 服务 填写 Base URL 和 API Key" };

  const word = await prisma.word.findUnique({
    where: { id: input.wordId },
    select: { id: true, spelling: true, translations: true, defEn: true, etymology: true, derivatives: true, mnemonic: true },
  });
  if (!word) return { ok: false, error: "单词不存在" };

  if (!input.force && word.defEn && word.etymology && word.derivatives && word.mnemonic) {
    return {
      ok: true,
      cached: true,
      data: {
        defEn: word.defEn,
        etymology: JSON.parse(word.etymology) as EtymologyPart[],
        derivatives: JSON.parse(word.derivatives) as Derivative[],
        mnemonic: word.mnemonic,
      },
    };
  }

  const provider = ai("text");
  if (!provider.chatJSON) throw new Error(`${provider.name} 不支持结构化输出`);

  const meanings = (JSON.parse(word.translations) as { pos: string; meaning: string }[])
    .map((t) => t.meaning)
    .join("；");
  const raw = await provider.chatJSON<Record<string, unknown>>(
    [
      { role: "system", content: ENRICH_PROMPT },
      { role: "user", content: `单词：${word.spelling}\n中文释义：${meanings}` },
    ],
    ENRICH_SCHEMA,
    { temperature: 0.6, maxTokens: 800, ...cfg },
  );

  const data: EnrichData = {
    defEn: String(raw.defEn ?? "").trim(),
    etymology: Array.isArray(raw.etymology)
      ? (raw.etymology as { part?: unknown; meaning?: unknown }[])
          .map((e) => ({ part: String(e.part ?? ""), meaning: String(e.meaning ?? "") }))
          .filter((e) => e.part && e.meaning)
      : [],
    derivatives: Array.isArray(raw.derivatives)
      ? (raw.derivatives as { word?: unknown; pos?: unknown; meaning?: unknown }[])
          .map((d) => ({ word: String(d.word ?? ""), pos: String(d.pos ?? ""), meaning: String(d.meaning ?? "") }))
          .filter((d) => d.word && d.meaning)
      : [],
    mnemonic: String(raw.mnemonic ?? "").trim(),
  };
  if (!data.defEn) return { ok: false, error: "AI 生成结果缺少英文释义，请重试" };

  await prisma.word.update({
    where: { id: word.id },
    data: {
      defEn: data.defEn,
      etymology: JSON.stringify(data.etymology),
      derivatives: JSON.stringify(data.derivatives),
      mnemonic: data.mnemonic,
    },
  });

  revalidatePath(`/vocab/${word.id}`);
  return { ok: true, cached: false, data };
}