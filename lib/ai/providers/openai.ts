import OpenAI from "openai";
import { getEnv } from "@/lib/env";
import { requestJSON, JSON_OUTPUT_RULES } from "@/lib/ai/json";
import type { AIProvider, AIModelInfo, ChatMessage, ChatOptions, ChatResult, RealtimeToken } from "@/lib/ai/provider";

let client: OpenAI | null = null;
// 文本客户端按 baseURL|apiKey 缓存，支持用户在设置页切换第三方网关后立即生效
const textClients = new Map<string, OpenAI>();
const TEXT_CLIENTS_MAX = 8;

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

// 文本 chat/chatJSON 用：优先文本专用凭据(如 tokenrhythm)，留空回落官方。
// overrides 来自用户设置页保存的 base/key（profile > env 文本专用 > env 通用）。
function getTextClient(overrides: { apiKey?: string; baseURL?: string } = {}): OpenAI {
  const env = getEnv();
  const apiKey = overrides.apiKey?.trim() || env.OPENAI_TEXT_API_KEY || env.OPENAI_API_KEY;
  const baseURL = overrides.baseURL?.trim() || env.OPENAI_TEXT_BASE_URL || env.OPENAI_BASE_URL;
  if (!apiKey) throw new Error("AI API Key 未配置：请在 设置 → AI 服务 填写，或在 .env 配置");
  const cacheKey = `${baseURL}|${apiKey}`;
  const hit = textClients.get(cacheKey);
  if (hit) return hit;
  if (textClients.size >= TEXT_CLIENTS_MAX) {
    const oldest = textClients.keys().next().value;
    if (oldest) textClients.delete(oldest);
  }
  const c = new OpenAI({
    apiKey,
    baseURL,
    timeout: TEXT_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  textClients.set(cacheKey, c);
  return c;
}

export const openaiProvider: AIProvider = {
  name: "openai",

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
    const env = getEnv();
    const c = getTextClient({ apiKey: opts.apiKey, baseURL: opts.baseUrl });
    const model = opts.model ?? env.OPENAI_TEXT_MODEL;
    const res = await c.chat.completions.create(
      {
        model,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens,
      },
      { signal: opts.signal },
    );
    return {
      text: res.choices[0]?.message?.content ?? "",
      provider: "openai",
      model,
      usage: { input: res.usage?.prompt_tokens, output: res.usage?.completion_tokens },
    };
  },

  async chatJSON<T>(messages: ChatMessage[], schema: unknown, opts: ChatOptions = {}): Promise<T> {
    const env = getEnv();
    const c = getTextClient({ apiKey: opts.apiKey, baseURL: opts.baseUrl });
    const model = opts.model ?? env.OPENAI_TEXT_MODEL;
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
          model,
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

  async listModels(opts: { baseUrl?: string; apiKey?: string } = {}): Promise<AIModelInfo[]> {
    const c = getTextClient({ apiKey: opts.apiKey, baseURL: opts.baseUrl });
    const res = await c.models.list();
    return res.data.map((m) => {
      // tokenrhythm 等网关会在 model 对象上附带扩展元数据；openai SDK 的 Model 类型
      // 不包含这些字段，按 any 读取，缺省时只回传 id
      const extra = (m as unknown as Record<string, unknown>);
      const pricing = extra.pricing as
        | { currency?: string; prompt?: string; completion?: string }
        | undefined;
      return {
        id: m.id,
        contextLength: typeof extra.context_length === "number" ? extra.context_length : undefined,
        pricing:
          pricing && typeof pricing.prompt === "string" && typeof pricing.completion === "string"
            ? {
                currency: pricing.currency ?? "CNY",
                inputPerM: Number(pricing.prompt),
                outputPerM: Number(pricing.completion),
              }
            : undefined,
        supportsTools: typeof extra.supports_tools === "boolean" ? extra.supports_tools : undefined,
        supportsVision: typeof extra.supports_vision === "boolean" ? extra.supports_vision : undefined,
      };
    });
  },

  async tts(text: string, opts = {}): Promise<Uint8Array> {
    const env = getEnv();
    const c = getClient();
    const res = await c.audio.speech.create({
      model: env.OPENAI_TTS_MODEL,
      voice: opts.voice ?? env.OPENAI_TTS_VOICE,
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
        voice: opts.voice ?? env.OPENAI_TTS_VOICE,
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
