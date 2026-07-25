import { getEnv } from "@/lib/env";
import type { AIProvider, ChatMessage, ChatOptions, ChatResult } from "@/lib/ai/provider";

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
      signal: opts.signal,
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
    const jsonSystem =
      "You must return only valid JSON matching this schema, no other text:\n" +
      JSON.stringify(schema);
    const patched = [{ role: "system" as const, content: jsonSystem }, ...messages];
    const res = await this.chat!(patched, opts);
    const cleaned = res.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned) as T;
  },
};
