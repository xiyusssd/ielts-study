import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ai } from "@/lib/ai";
import { getAiConfig } from "@/lib/ai/actions";
import { BASE_URL_RE } from "@/lib/ai/config";
import { friendlyAIError } from "@/lib/ai/errors";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// 依赖运行时 env · 不 pre-render
export const dynamic = "force-dynamic";

type SavedProfile = { baseUrl: string; apiKey: string; model: string };

function shapeSaved(p: {
  aiBaseUrl: string | null;
  aiApiKey: string | null;
  aiTextModel: string | null;
}): SavedProfile {
  return { baseUrl: p.aiBaseUrl ?? "", apiKey: p.aiApiKey ?? "", model: p.aiTextModel ?? "" };
}

function requireListModels(provider: ReturnType<typeof ai>) {
  if (!provider.listModels) {
    throw new Error(`provider "${provider.name}" 不支持模型列表。`);
  }
  return provider.listModels;
}

function rateCheck(req: Request, bucket: string): NextResponse | null {
  const ip = getClientIp(req.headers);
  const rl = rateLimit(`${bucket}:${ip}`, 10, 60_000); // 每 IP 每分钟 10 次
  if (!rl.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${Math.ceil(rl.resetInMs / 1000)} 秒后再试` },
      { status: 429 },
    );
  }
  return null;
}

/**
 * GET：回传表单回填所需的三项（saved/effective/current），并尝试用「已保存（或 env 回退）」
 * 凭据拉取模型列表。模型列表拉取失败不阻塞表单 —— 用户仍可手工填写 Base URL / Key / 模型
 * 并保存，因此网关故障只以 warning 形式返回。
 * apiKey 只回传用户自己的保存值（认证会话内），不会泄漏 env 里的 key。
 */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const limited = rateCheck(req, "ai-models");
  if (limited) return limited;

  const [cfg, profile] = await Promise.all([
    getAiConfig(user.id),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { aiBaseUrl: true, aiApiKey: true, aiTextModel: true },
    }),
  ]);

  // 表单回填数据永远返回：保存功能不依赖模型列表拉取成功
  const base = {
    current: cfg.model,
    provider: ai("text").name,
    effective: { baseUrl: cfg.baseUrl, model: cfg.model, apiKeyFromEnv: !profile?.aiApiKey && !!cfg.apiKey },
    saved: shapeSaved(profile ?? { aiBaseUrl: null, aiApiKey: null, aiTextModel: null }),
  };

  if (!cfg.apiKey) {
    return NextResponse.json({
      ...base,
      models: [],
      warning: "未配置 API Key：请在下方填写 Base URL / Key 后保存，或在 .env 配置",
    });
  }

  try {
    const provider = ai("text");
    const listModels = requireListModels(provider);
    const models = await listModels({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey });
    return NextResponse.json({ ...base, models });
  } catch (err) {
    return NextResponse.json({
      ...base,
      models: [],
      warning: `模型列表拉取失败：${friendlyAIError(err)}（仍可手工填写并保存配置）`,
    });
  }
}

/**
 * POST：用「草稿」base/key（尚未保存）拉取模型列表，验证网关连通性。
 * 空值回落到已保存值 / env，与保存后的解析逻辑一致。
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const limited = rateCheck(req, "ai-models");
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim().slice(0, 512) : "";
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim().slice(0, 512) : "";
  if (baseUrl && !BASE_URL_RE.test(baseUrl)) {
    return NextResponse.json({ error: "Base URL 必须是 http(s) 地址" }, { status: 400 });
  }

  try {
    const provider = ai("text");
    const listModels = requireListModels(provider);
    const models = await listModels({ baseUrl: baseUrl || undefined, apiKey: apiKey || undefined });
    return NextResponse.json({ models });
  } catch (err) {
    return NextResponse.json({ error: friendlyAIError(err) }, { status: 500 });
  }
}