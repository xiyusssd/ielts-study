import OpenAI from "openai";
import { getEnv } from "@/lib/env";
import { requestJSON, JSON_OUTPUT_RULES } from "@/lib/ai/json";
import type { AIProvider, ChatMessage, ChatOptions, ChatResult, RealtimeToken } from "@/lib/ai/provider";

let client: OpenAI | null = null;
let textClient: OpenAI | null = null;

// SDK 默认超时 10 分钟——慢网下 AI 调用会挂死整个 server action。收紧到
// 文本 60s / 语音 45s，配合 SDK 自带 maxRetries(对超时+5xx 自动退避重试)。
const TEXT_TIMEOUT_MS = 60_000;
const VOICE_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 2;

// 语音/STT/realtime 用：始终走官方 OpenAI(OPENAI_*)
function getClient(): OpenAI {
  if (client) return client;
  const env = getEnv();
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 未配置");
  client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
    timeout: VOICE_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  return client;
}

// 文本 chat/chatJSON 用：优先文本专用凭据(如 airouter),留空回落官方
function getTextClient(): OpenAI {
  if (textClient) return textClient;
  const env = getEnv();
  const apiKey = env.OPENAI_TEXT_API_KEY || env.OPENAI_API_KEY;
  const baseURL = env.OPENAI_TEXT_BASE_URL || env.OPENAI_BASE_URL;
  if (!apiKey) throw new Error("OPENAI_TEXT_API_KEY / OPENAI_API_KEY 未配置");
  textClient = new OpenAI({
    apiKey,
    baseURL,
    timeout: TEXT_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  return textClient;
}

export const openaiProvider: AIProvider = {
  name: "openai",

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
    const env = getEnv();
    const c = getTextClient();
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
    const c = getTextClient();
    // 官方 OpenAI 用 strict json_schema 强制结构；但第三方路由(如 airouter)代理到
    // Claude 系模型时会静默丢弃 json_schema——模型看不到 schema 就自己编结构，且常在
    // 字符串里塞未转义双引号撑坏 JSON。对策：①把 schema+硬约束内联进提示，②失败自动重试。
    const withJsonHint: ChatMessage[] = [
      ...messages,
      { role: "system", content: JSON_OUTPUT_RULES + "\nSchema:\n" + JSON.stringify(schema) },
    ];
    return requestJSON<T>(async () => {
      const res = await c.chat.completions.create(
        {
          model: env.OPENAI_TEXT_MODEL,
          messages: withJsonHint,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens,
          response_format: {
            type: "json_schema",
            json_schema: { name: "response", schema: schema as Record<string, unknown>, strict: true },
          },
        },
        { signal: opts.signal },
      );
      return res.choices[0]?.message?.content ?? "{}";
    });
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
      signal: AbortSignal.timeout(VOICE_TIMEOUT_MS),
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
