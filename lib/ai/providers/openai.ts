import OpenAI from "openai";
import { getEnv } from "@/lib/env";
import type { AIProvider, ChatMessage, ChatOptions, ChatResult, RealtimeToken } from "@/lib/ai/provider";

let client: OpenAI | null = null;
let textClient: OpenAI | null = null;

// 语音/STT/realtime 用：始终走官方 OpenAI(OPENAI_*)
function getClient(): OpenAI {
  if (client) return client;
  const env = getEnv();
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 未配置");
  client = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
  return client;
}

// 文本 chat/chatJSON 用：优先文本专用凭据(如 airouter),留空回落官方
function getTextClient(): OpenAI {
  if (textClient) return textClient;
  const env = getEnv();
  const apiKey = env.OPENAI_TEXT_API_KEY || env.OPENAI_API_KEY;
  const baseURL = env.OPENAI_TEXT_BASE_URL || env.OPENAI_BASE_URL;
  if (!apiKey) throw new Error("OPENAI_TEXT_API_KEY / OPENAI_API_KEY 未配置");
  textClient = new OpenAI({ apiKey, baseURL });
  return textClient;
}

// 第三方路由(Claude 系)常把 JSON 包在 ```json 围栏或夹带解释文字里，
// OpenAI 官方 strict schema 则直接返回纯 JSON。统一在这里扒出 JSON 主体。
function extractJSON(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const first = s.search(/[[{]/);
  if (first > 0) s = s.slice(first);
  const lastObj = s.lastIndexOf("}");
  const lastArr = s.lastIndexOf("]");
  const last = Math.max(lastObj, lastArr);
  if (last >= 0 && last < s.length - 1) s = s.slice(0, last + 1);
  return s.trim();
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
    // 官方 OpenAI 支持 strict json_schema；第三方路由(Claude 系)可能忽略它，
    // 所以再在末尾追加一条系统级指令强制只输出 JSON，双保险。
    const withJsonHint: ChatMessage[] = [
      ...messages,
      { role: "system", content: "只输出符合要求的 JSON，不要任何解释、前后缀或 markdown 代码围栏。" },
    ];
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
    const content = res.choices[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(content) as T;
    } catch {
      // 路由未强制 schema，返回了围栏/夹带文字——扒出 JSON 主体再解析
      return JSON.parse(extractJSON(content)) as T;
    }
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
