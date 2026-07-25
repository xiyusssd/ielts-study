import OpenAI from "openai";
import { getEnv } from "@/lib/env";
import type { AIProvider, ChatMessage, ChatOptions, ChatResult, RealtimeToken } from "@/lib/ai/provider";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const env = getEnv();
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 未配置");
  client = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
  return client;
}

export const openaiProvider: AIProvider = {
  name: "openai",

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
    const env = getEnv();
    const c = getClient();
    const res = await c.chat.completions.create(
      {
        model: env.OPENAI_TEXT_MODEL,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens,
      },
      { signal: opts.signal },
    );
    return {
      text: res.choices[0]?.message?.content ?? "",
      provider: "openai",
      model: env.OPENAI_TEXT_MODEL,
      usage: { input: res.usage?.prompt_tokens, output: res.usage?.completion_tokens },
    };
  },

  async chatJSON<T>(messages: ChatMessage[], schema: unknown, opts: ChatOptions = {}): Promise<T> {
    const env = getEnv();
    const c = getClient();
    const res = await c.chat.completions.create(
      {
        model: env.OPENAI_TEXT_MODEL,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: { name: "response", schema: schema as Record<string, unknown>, strict: true },
        },
      },
      { signal: opts.signal },
    );
    const content = res.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as T;
  },

  async tts(text: string, opts = {}): Promise<Uint8Array> {
    const env = getEnv();
    const c = getClient();
    const res = await c.audio.speech.create({
      model: env.OPENAI_TTS_MODEL,
      voice: (opts.voice as "alloy") ?? "alloy",
      input: text,
      response_format: opts.format ?? "mp3",
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return new Uint8Array(buf);
  },

  async stt(audio: Blob | Uint8Array, opts = {}): Promise<string> {
    const env = getEnv();
    const c = getClient();
    const file =
      audio instanceof Blob
        ? audio
        : new Blob([audio.buffer as ArrayBuffer], { type: "audio/mp3" });
    const res = await c.audio.transcriptions.create({
      model: env.OPENAI_STT_MODEL,
      file: new File([file], "audio.mp3", { type: file.type || "audio/mp3" }),
      language: opts.language,
    });
    return res.text;
  },

  async realtimeToken(opts = {}): Promise<RealtimeToken> {
    const env = getEnv();
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 未配置");
    const res = await fetch(`${env.OPENAI_BASE_URL}/realtime/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_REALTIME_MODEL,
        voice: opts.voice ?? "alloy",
        instructions: opts.instructions,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI Realtime session 创建失败: ${res.status} ${errText}`);
    }
    const data = (await res.json()) as {
      id: string;
      client_secret: { value: string; expires_at: number };
    };
    return {
      provider: "openai",
      model: env.OPENAI_REALTIME_MODEL,
      sessionId: data.id,
      clientSecret: data.client_secret.value,
      expiresAt: data.client_secret.expires_at * 1000,
    };
  },
};
