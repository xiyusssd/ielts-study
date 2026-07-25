import { z } from "zod";

const providerEnum = z.enum(["openai", "anthropic", "ollama"]);

// build phase 时用宽松默认，避免 CI Docker build 因缺 .env 失败
// 运行时（next start / dev）必须传真实值
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

const schema = z.object({
  DATABASE_URL: IS_BUILD ? z.string().default("file:./build-placeholder.db") : z.string().min(1),
  SESSION_SECRET: IS_BUILD
    ? z.string().default("build-time-placeholder-secret-not-for-runtime-use")
    : z.string().min(32, "SESSION_SECRET 至少 32 字节，用 openssl rand -base64 48 生成"),

  AI_TEXT_PROVIDER: providerEnum.default("openai"),
  AI_VOICE_PROVIDER: z.enum(["openai"]).default("openai"),
  AI_STT_PROVIDER: z.enum(["openai"]).default("openai"),
  AI_REALTIME_PROVIDER: z.enum(["openai"]).default("openai"),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  OPENAI_TEXT_MODEL: z.string().default("gpt-4o"),
  OPENAI_TTS_MODEL: z.string().default("tts-1"),
  OPENAI_STT_MODEL: z.string().default("whisper-1"),
  OPENAI_REALTIME_MODEL: z.string().default("gpt-4o-realtime-preview"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_TEXT_MODEL: z.string().default("claude-sonnet-4-6"),

  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_TEXT_MODEL: z.string().default("qwen2.5:7b"),

  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ 环境变量校验失败：", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  cached = parsed.data;
  return cached;
}

/** 各能力对应的凭据是否可用 */
export function providerReady(kind: "text" | "voice" | "stt" | "realtime"): boolean {
  const env = getEnv();
  const map: Record<typeof kind, string> = {
    text: env.AI_TEXT_PROVIDER,
    voice: env.AI_VOICE_PROVIDER,
    stt: env.AI_STT_PROVIDER,
    realtime: env.AI_REALTIME_PROVIDER,
  };
  const p = map[kind];
  if (p === "openai") return !!env.OPENAI_API_KEY;
  if (p === "anthropic") return !!env.ANTHROPIC_API_KEY;
  if (p === "ollama") return true;
  return false;
}
