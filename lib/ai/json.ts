/**
 * 统一的 AI JSON 输出解析。
 * 官方 OpenAI strict json_schema 返回纯 JSON；第三方路由(Claude 系)常把 JSON
 * 包在 ```json 围栏里或夹带解释文字。这里先直接 parse，失败再扒出 JSON 主体重试，
 * 保证任一 provider 返回夹带文字时都不会裸 JSON.parse 抛错崩到用户界面。
 */

/** 从可能夹带文字/围栏的字符串里扒出 JSON 主体 */
export function extractJSON(raw: string): string {
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

/** 宽松解析：先直接 parse，失败再扒 JSON 主体重试；都失败抛带片段的清晰错误 */
export function parseJSON<T>(raw: string): T {
  const content = raw ?? "";
  try {
    return JSON.parse(content) as T;
  } catch {
    try {
      return JSON.parse(extractJSON(content)) as T;
    } catch {
      throw new Error(`AI 返回的内容不是合法 JSON：${content.slice(0, 200)}`);
    }
  }
}

/**
 * 附加到 JSON 输出提示里的硬约束。
 * 关键：Claude 系模型常在字符串值内部塞未转义的英文双引号(如 「way表示"方式"」)，
 * 直接把 JSON 撑坏。明确要求字符串内改用中文引号「」，大幅降低解析失败率。
 */
export const JSON_OUTPUT_RULES =
  "只输出符合下面 JSON Schema 的合法 JSON，键名必须完全一致，不要增删键。" +
  "严禁在字符串值内部使用英文双引号 \"，需要引用时一律改用中文引号「」或单引号。" +
  "不要输出任何解释、前后缀或 markdown 代码围栏。";

/**
 * 请求并解析 JSON，失败自动重试。
 * 第三方路由代理到 Claude 时不强制 schema，偶发返回结构错/非法 JSON——
 * 重试几次即可拿到合法结果，避免批改/评分因单次抖动直接失败。
 */
export async function requestJSON<T>(call: () => Promise<string>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    let raw: string;
    try {
      raw = await call();
    } catch (e) {
      lastErr = e;
      continue; // 网络/超时错也重试
    }
    try {
      return parseJSON<T>(raw);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("AI JSON 请求多次失败");
}
