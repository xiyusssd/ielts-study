import { getEnv } from "@/lib/env";
import type { AIProvider, ProviderKind } from "@/lib/ai/provider";
import { openaiProvider } from "@/lib/ai/providers/openai";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { ollamaProvider } from "@/lib/ai/providers/ollama";

const REGISTRY: Record<string, AIProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  ollama: ollamaProvider,
};

/** 根据 env 的能力配置返回对应 provider */
export function ai(kind: ProviderKind): AIProvider {
  const env = getEnv();
  const map: Record<ProviderKind, string> = {
    text: env.AI_TEXT_PROVIDER,
    voice: env.AI_VOICE_PROVIDER,
    stt: env.AI_STT_PROVIDER,
    realtime: env.AI_REALTIME_PROVIDER,
  };
  const name = map[kind];
  const p = REGISTRY[name];
  if (!p) throw new Error(`未知的 AI provider: ${name}（能力：${kind}）`);
  return p;
}

/** 列出所有已注册 provider（用于 /settings/ai 页面） */
export function listProviders(): { name: string; capabilities: ProviderKind[] }[] {
  return Object.entries(REGISTRY).map(([name, p]) => {
    const caps: ProviderKind[] = [];
    if (p.chat) caps.push("text");
    if (p.tts) caps.push("voice");
    if (p.stt) caps.push("stt");
    if (p.realtimeToken) caps.push("realtime");
    return { name, capabilities: caps };
  });
}

export { openaiProvider, anthropicProvider, ollamaProvider };
