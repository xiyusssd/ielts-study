import { getEnv } from "@/lib/env";
import { requestJSON, JSON_OUTPUT_RULES } from "@/lib/ai/json";
import type { AIProvider, ChatMessage, ChatOptions, ChatResult } from "@/lib/ai/provider";

// 本地模型也可能卡住（模型没加载/显存不足），给 120s 超时兜底。
const TIMEOUT_MS = 120_000;

export const ollamaProvider: AIProvider = {
  name: "ollama",

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
    const env = getEnv();
    const res = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_TEXT_MODEL,
        messages,
        options: { temperature: opts.temperature ?? 0.3 },
        stream: false,
      }),
      signal: opts.signal ?? AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Ollama 调用失败: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };
    return {
      text: data.message?.content ?? "",
      provider: "ollama",
      model: env.OLLAMA_TEXT_MODEL,
      usage: { input: data.prompt_eval_count, output: data.eval_count },
    };
  },

  async chatJSON<T>(messages: ChatMessage[], schema: unknown, opts: ChatOptions = {}): Promise<T> {
    const jsonSystem = JSON_OUTPUT_RULES + "\nSchema:\n" + JSON.stringify(schema);
    const patched = [{ role: "system" as const, content: jsonSystem }, ...messages];
    return requestJSON<T>(async () => (await this.chat!(patched, opts)).text);
  },
};
