/**
 * AI Provider 统一抽象接口。
 * 所有 provider 实现这个接口的子集；每个能力 (text/voice/stt/realtime)
 * 通过 env 独立切换（AI_TEXT_PROVIDER / AI_VOICE_PROVIDER 等）。
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: unknown; // 结构化输出
  signal?: AbortSignal;
};

export type ChatResult = {
  text: string;
  provider: string;
  model: string;
  usage?: { input?: number; output?: number };
};

export type RealtimeToken = {
  provider: string;
  model: string;
  sessionId: string;
  clientSecret: string;
  expiresAt: number;
  wsUrl?: string;
};

export interface AIProvider {
  name: string;

  /** 文本生成 */
  chat?(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;

  /** 结构化输出（JSON 严格模式），返回已解析对象 */
  chatJSON?<T>(messages: ChatMessage[], schema: unknown, opts?: ChatOptions): Promise<T>;

  /** 文字转语音，返回 mp3/opus 音频字节 */
  tts?(text: string, opts?: { voice?: string; format?: "mp3" | "wav" | "opus" }): Promise<Uint8Array>;

  /** 语音转文字 */
  stt?(audio: Blob | Uint8Array, opts?: { language?: string }): Promise<string>;

  /** 签发 Realtime API 短期客户端凭证（用于前端 WebRTC 直连） */
  realtimeToken?(opts?: {
    instructions?: string;
    voice?: string;
  }): Promise<RealtimeToken>;
}

/** 用于选择器 */
export type ProviderKind = "text" | "voice" | "stt" | "realtime";
