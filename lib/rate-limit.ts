/**
 * 极简进程内 rate limiter（无需 Redis）。
 * 用途：登录 / 注册 / AI 调用 · 防暴力破解和刷 API。
 *
 * 生产多实例部署应换成 Redis / Upstash · 单机 Docker 部署完全够用。
 */

type Bucket = { hits: number; resetAt: number };

const store = new Map<string, Bucket>();

// 定期清理过期 bucket，避免内存泄漏
if (typeof globalThis !== "undefined" && !("__rlCleanup" in globalThis)) {
  (globalThis as { __rlCleanup?: boolean }).__rlCleanup = true;
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (v.resetAt < now) store.delete(k);
    }
  }, 60_000).unref?.();
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetInMs: number;
};

/**
 * @param key      唯一标识：一般是 `action:ip` 或 `action:userId`
 * @param limit    时间窗口内最多允许的请求数
 * @param windowMs 时间窗口毫秒
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt < now) {
    store.set(key, { hits: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetInMs: windowMs };
  }
  bucket.hits++;
  const remaining = Math.max(0, limit - bucket.hits);
  return {
    ok: bucket.hits <= limit,
    remaining,
    resetInMs: bucket.resetAt - now,
  };
}

/** 从 headers 抽取客户端 IP（支持反向代理） */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
