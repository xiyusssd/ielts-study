/**
 * 词汇 AI 富化字段的类型与解析。
 * 纯模块（非 "use server"），可被 server actions、RSC 页面与客户端组件共用。
 */

export type EtymologyPart = { part: string; meaning: string };
export type Derivative = { word: string; pos: string; meaning: string };
export type WordStory = { en: string; zh: string };

/** 安全解析 Word.etymology / Word.derivatives 这类 JSON 数组列。 */
export function parseJSONArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

/** 安全解析 Word.story 的 {en, zh}。 */
export function parseStory(raw: string | null | undefined): WordStory | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<WordStory>;
    return typeof v.en === "string" && typeof v.zh === "string" ? { en: v.en, zh: v.zh } : null;
  } catch {
    return null;
  }
}

export const etymologyOf = (raw: string | null | undefined): EtymologyPart[] => parseJSONArray<EtymologyPart>(raw);
export const derivativesOf = (raw: string | null | undefined): Derivative[] => parseJSONArray<Derivative>(raw);