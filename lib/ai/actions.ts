"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getEnv, providerReady } from "@/lib/env";
import { MODEL_ID_RE, BASE_URL_RE, MAX_KEY_LEN } from "@/lib/ai/config";
import type { TextClientOverrides } from "@/lib/ai/provider";

/**
 * 用户当前生效的文本 AI 配置（全部解析为最终值，可直接展开进 ChatOptions）：
 * 设置页保存的值 > env 文本专用值 > env 通用值。
 * 所有文本 AI 调用点应在拿到 user 后调用本函数。
 */
export async function getAiConfig(userId: string): Promise<TextClientOverrides> {
  const env = getEnv();
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { aiBaseUrl: true, aiApiKey: true, aiTextModel: true },
  });
  return {
    baseUrl: profile?.aiBaseUrl?.trim() || env.OPENAI_TEXT_BASE_URL || env.OPENAI_BASE_URL,
    apiKey: profile?.aiApiKey?.trim() || env.OPENAI_TEXT_API_KEY || env.OPENAI_API_KEY || "",
    model: profile?.aiTextModel?.trim() || env.OPENAI_TEXT_MODEL,
  };
}

/** 文本 AI 是否可用：env 已配，或用户在设置页自配了网关 */
export async function aiTextReady(userId: string): Promise<boolean> {
  if (providerReady("text")) return true;
  const cfg = await getAiConfig(userId);
  return !!cfg.apiKey;
}

/**
 * 保存用户在设置页填写的文本 AI 配置（base/key/模型三合一）。
 * 传入 null 表示清空该项、恢复 env 回退。
 */
export async function saveAiSettings(input: {
  baseUrl?: string | null;
  apiKey?: string | null;
  model?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };

  const baseUrl = input.baseUrl?.trim() || null;
  const apiKey = input.apiKey?.trim() || null;
  const model = input.model?.trim() || null;

  if (baseUrl && !BASE_URL_RE.test(baseUrl)) {
    return { ok: false, error: "Base URL 必须是 http(s) 地址" };
  }
  if (apiKey && apiKey.length > MAX_KEY_LEN) {
    return { ok: false, error: `API Key 过长（最多 ${MAX_KEY_LEN} 字符）` };
  }
  if (model && !MODEL_ID_RE.test(model)) {
    return { ok: false, error: "模型名称格式不合法" };
  }

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, aiBaseUrl: baseUrl, aiApiKey: apiKey, aiTextModel: model },
    update: { aiBaseUrl: baseUrl, aiApiKey: apiKey, aiTextModel: model },
  });

  revalidatePath("/settings");
  return { ok: true };
}