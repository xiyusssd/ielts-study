/**
 * 浏览器 SpeechSynthesis 语音引擎。
 *
 * 核心设计：
 * 1. 异步等待语音列表加载（Chrome 首次 getVoices() 返回空数组）
 * 2. 质量评分机制：优选 macOS 高品质语音 + Google Cloud 语音
 * 3. localStorage 持久化用户偏好
 * 4. 为不同语音自动调优 rate/pitch
 *
 * 使用方式：
 *   await ensureVoicesLoaded();        // 页面初始化时调用一次
 *   speakText("Hello world");           // 朗读
 *   const v = getSelectedVoice();       // 获取当前选中语音
 */

const STORAGE_KEY = "ielts-tts-voice";

/* ------------------------------------------------------------------ */
/*  语音质量评分：分数越高越自然                                        */
/* ------------------------------------------------------------------ */

type VoiceEntry = {
  /** 匹配关键词（全小写，partially match voice.name.toLowerCase()） */
  keywords: string[];
  /** 质量分（0-100，越高越自然） */
  score: number;
  /** 推荐播放速率 */
  rate: number;
  /** 推荐音高 */
  pitch: number;
};

/**
 * 按质量从高到低排列。
 * macOS 高品质语音需要用户在「系统设置 → 辅助功能 → 语音内容 → 管理语音」下载。
 * 未下载时自动跳过，降级到下一档。
 */
const VOICE_QUALITY_TABLE: VoiceEntry[] = [
  // ── 顶级 macOS 自然语音（需下载） ──
  { keywords: ["samantha"], score: 98, rate: 0.92, pitch: 1.0 },
  { keywords: ["karen"], score: 95, rate: 0.90, pitch: 1.0 },
  { keywords: ["ava"], score: 93, rate: 0.92, pitch: 1.0 },       // macOS 15+
  { keywords: ["allison"], score: 92, rate: 0.92, pitch: 1.0 },
  { keywords: ["susan"], score: 90, rate: 0.90, pitch: 1.0 },
  { keywords: ["moira"], score: 88, rate: 0.90, pitch: 1.0 },
  // ── 优质 macOS 语音 ──
  { keywords: ["alex"], score: 82, rate: 0.95, pitch: 1.0 },
  { keywords: ["tom"], score: 80, rate: 0.95, pitch: 1.0 },
  { keywords: ["daniel"], score: 78, rate: 0.95, pitch: 0.95 },   // 英音
  { keywords: ["fiona"], score: 76, rate: 0.92, pitch: 1.0 },     // 苏格兰音
  { keywords: ["veena"], score: 74, rate: 0.92, pitch: 1.0 },
  // ── Google Cloud 语音（Chrome 自带，跨平台高质量） ──
  { keywords: ["google uk english female"], score: 88, rate: 0.95, pitch: 1.0 },
  { keywords: ["google uk english male"], score: 85, rate: 0.95, pitch: 1.0 },
  { keywords: ["google us english"], score: 85, rate: 0.95, pitch: 1.0 },
  // ── Windows 系统语音 ──
  { keywords: ["microsoft zira"], score: 60, rate: 0.95, pitch: 1.0 },
  { keywords: ["microsoft david"], score: 55, rate: 0.95, pitch: 1.0 },
  { keywords: ["microsoft mark"], score: 55, rate: 0.95, pitch: 1.0 },
  { keywords: ["microsoft aria"], score: 62, rate: 0.95, pitch: 1.0 },
  { keywords: ["microsoft guy"], score: 58, rate: 0.95, pitch: 1.0 },
  // ── Linux / Android ──
  { keywords: ["english (great britain)"], score: 50, rate: 0.92, pitch: 1.0 },
  { keywords: ["english (united states)"], score: 50, rate: 0.92, pitch: 1.0 },
];

/* ------------------------------------------------------------------ */
/*  状态管理                                                           */
/* ------------------------------------------------------------------ */

type VoiceState = {
  voices: SpeechSynthesisVoice[];
  selectedName: string | null;  // localStorage 持久化的偏好
  selected: SpeechSynthesisVoice | null;
  loaded: boolean;
};

let _state: VoiceState = {
  voices: [],
  selectedName: null,
  selected: null,
  loaded: false,
};

let _voicesLoadedPromise: Promise<void> | null = null;

/* ------------------------------------------------------------------ */
/*  公开 API                                                           */
/* ------------------------------------------------------------------ */

/**
 * 确保语音列表已加载。页面初始化时调用。
 * 返回 Promise，resolve 后即可安全使用 speakText / getSelectedVoice。
 */
export function ensureVoicesLoaded(): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve();
  }
  if (_voicesLoadedPromise) return _voicesLoadedPromise;

  _voicesLoadedPromise = new Promise<void>((resolve) => {
    const synth = window.speechSynthesis;

    // 先尝试同步获取（Firefox / Safari 在脚本加载时已有完整列表）
    const sync = synth.getVoices();
    if (sync.length > 0) {
      refreshVoices(sync);
      resolve();
      return;
    }

    // Chrome：监听 voiceschanged 事件等待异步加载
    const handler = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        synth.removeEventListener("voiceschanged", handler);
        refreshVoices(voices);
        resolve();
      }
    };
    synth.addEventListener("voiceschanged", handler);

    // 超时保护：3 秒后无论如何 resolve（用已有列表或空列表）
    setTimeout(() => {
      synth.removeEventListener("voiceschanged", handler);
      refreshVoices(synth.getVoices());
      resolve();
    }, 3000);
  });

  return _voicesLoadedPromise;
}

/**
 * 获取当前系统所有英文语音列表，按质量评分排序。
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return _state.voices;
}

/**
 * 获取当前选中的语音（用户偏好或自动最佳）。
 */
export function getSelectedVoice(): SpeechSynthesisVoice | null {
  return _state.selected;
}

/**
 * 手动切换语音并持久化。
 */
export function selectVoice(voiceName: string): void {
  _state.selectedName = voiceName;
  _state.selected = _state.voices.find((v) => v.name === voiceName) ?? null;
  try {
    localStorage.setItem(STORAGE_KEY, voiceName);
  } catch {
    // localStorage 不可用（隐私模式等）
  }
}

/**
 * 朗读文本。自动选择最佳语音，支持调速。
 * @returns 清理函数，调用后停止朗读
 */
export function speakText(
  text: string,
  opts: { rate?: number; pitch?: number; lang?: string } = {},
): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return () => {};
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const voice = getSelectedVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = opts.lang ?? voice?.lang ?? "en-US";
  utterance.rate = opts.rate ?? 0.92;
  utterance.pitch = opts.pitch ?? 1.0;
  if (voice) utterance.voice = voice;

  synth.speak(utterance);

  return () => synth.cancel();
}

/**
 * 同 speakText，但返回 Promise，在朗读结束时 resolve。
 */
export function speakTextAsync(
  text: string,
  opts: { rate?: number; pitch?: number; lang?: string } = {},
): { promise: Promise<void>; cancel: () => void } {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { promise: Promise.resolve(), cancel: () => {} };
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const voice = getSelectedVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = opts.lang ?? voice?.lang ?? "en-US";
  utterance.rate = opts.rate ?? 0.92;
  utterance.pitch = opts.pitch ?? 1.0;
  if (voice) utterance.voice = voice;

  const promise = new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
  });

  synth.speak(utterance);
  return { promise, cancel: () => synth.cancel() };
}

/* ------------------------------------------------------------------ */
/*  内部实现                                                           */
/* ------------------------------------------------------------------ */

/**
 * 用质量评分表刷新语音列表和当前选中语音。
 */
function refreshVoices(allVoices: SpeechSynthesisVoice[]) {
  // 只保留英文语音，按质量评分排序
  const enVoices = allVoices.filter((v) => v.lang.startsWith("en"));

  // 为每个语音计算质量分
  const scored = enVoices.map((v) => {
    const name = v.name.toLowerCase();
    const entry = VOICE_QUALITY_TABLE.find((e) =>
      e.keywords.some((kw) => name.includes(kw)),
    );
    return { voice: v, score: entry?.score ?? 0 };
  });

  // 按分数降序排列
  scored.sort((a, b) => b.score - a.score);
  const sorted = scored.map((s) => s.voice);

  _state.voices = sorted;
  _state.loaded = true;

  // 恢复用户偏好
  let preferred: SpeechSynthesisVoice | null = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      preferred = sorted.find((v) => v.name === saved) ?? null;
    }
  } catch {
    // ignore
  }

  if (preferred) {
    _state.selectedName = preferred.name;
    _state.selected = preferred;
  } else {
    // 自动选最高分
    _state.selected = sorted[0] ?? null;
    _state.selectedName = _state.selected?.name ?? null;
  }
}

// 保留旧 API 兼容
export function pickBestVoice(): SpeechSynthesisVoice | null {
  return getSelectedVoice();
}

export function clearVoiceCache(): void {
  // no-op: 新引擎通过 ensureVoicesLoaded 重新加载即可
}