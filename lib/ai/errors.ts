/**
 * 把上游 AI 报错(第三方路由/官方)翻译成对用户友好的中文提示。
 * 慢网超时、key 失效、限流是最常见的三类"有些时候报错"来源。
 */
export function friendlyAIError(err: unknown): string {
  const e = err as { status?: number; name?: string; message?: string };
  const status = e?.status;
  const name = e?.name ?? "";
  const msg = e?.message ?? String(err);

  if (name === "TimeoutError" || name === "AbortError" || /timed out|timeout/i.test(msg)) {
    return "AI 服务响应超时，请稍后重试(可能是网络较慢)";
  }
  if (status === 401 || status === 403 || /invalid token|unauthorized|api key/i.test(msg)) {
    return "AI 密钥无效或已过期，请在设置中更新后重试";
  }
  if (status === 429 || /rate limit|too many/i.test(msg)) {
    return "AI 请求过于频繁或额度已用尽，请稍后再试";
  }
  if (status && status >= 500) {
    return "AI 服务暂时不可用，请稍后重试";
  }
  return `AI 调用失败：${msg.slice(0, 120)}`;
}
