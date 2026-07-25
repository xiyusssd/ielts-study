import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";
import type { AIProvider, ChatMessage, ChatOptions, ChatResult } from "@/lib/ai/provider";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  const env = getEnv();
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 未配置");
  client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
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
    // Anthropic 没有严格 json_schema，用系统指令 + 后处理提取
    const jsonSystem =
      "你必须只输出符合以下 JSON Schema 的合法 JSON，不要输出任何其它文字或代码块围栏。\n" +
      "Schema:\n" +
      JSON.stringify(schema);
    const patched = [{ role: "system" as const, content: jsonSystem }, ...messages];
    const res = await this.chat!(patched, opts);
    const cleaned = res.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned) as T;
  },
};
