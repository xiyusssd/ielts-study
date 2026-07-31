import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";
import { requestJSON, JSON_OUTPUT_RULES } from "@/lib/ai/json";
import type { AIProvider, ChatMessage, ChatOptions, ChatResult } from "@/lib/ai/provider";

let client: Anthropic | null = null;

// SDK 默认超时过长，慢网会挂死 server action。收紧到 60s + 自动重试。
const TEXT_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

function getClient(): Anthropic {
  if (client) return client;
  const env = getEnv();
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 未配置");
  client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: TEXT_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  return client;
}

function split(messages: ChatMessage[]) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  return { system, rest };
}

export const anthropicProvider: AIProvider = {
  name: "anthropic",

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
    const env = getEnv();
    const c = getClient();
    const { system, rest } = split(messages);
    const res = await c.messages.create({
      model: env.ANTHROPIC_TEXT_MODEL,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.3,
      system: system || undefined,
      messages: rest,
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return {
      text,
      provider: "anthropic",
      model: env.ANTHROPIC_TEXT_MODEL,
      usage: { input: res.usage.input_tokens, output: res.usage.output_tokens },
    };
  },

  async chatJSON<T>(messages: ChatMessage[], schema: unknown, opts: ChatOptions = {}): Promise<T> {
    // Anthropic 没有严格 json_schema，用系统指令约束 + 失败自动重试
    const jsonSystem = JSON_OUTPUT_RULES + "\nSchema:\n" + JSON.stringify(schema);
    const patched = [{ role: "system" as const, content: jsonSystem }, ...messages];
    return requestJSON<T>(async () => (await this.chat!(patched, opts)).text);
  },
};
