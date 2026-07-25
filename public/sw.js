/**
 * Service Worker — 让应用可离线运行，同时是 PWA "可安装" 的必要条件之一。
 *
 * 策略：
 * - Network-first for HTML pages（登录状态敏感）
 * - Cache-first for /_next/static/*、/icon、/apple-icon（不常变）
 * - 完全跳过 /api/*（不缓存，避免陈旧数据）
 */

const CACHE_VERSION = "ielts-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Precache 一些静态资源；具体的 next/static 会在运行时按需缓存
      return cache.addAll([
        "/manifest.webmanifest",
        "/icon",
        "/apple-icon",
      ]).catch(() => {
        // 单个失败不阻塞安装
      });
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 清理旧版本缓存
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 只处理同源 GET
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // 完全跳过 API 与 server actions（POST 也不会到这，双保险）
  if (url.pathname.startsWith("/api/")) return;

  // 静态资源 → cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/icon" ||
    url.pathname === "/apple-icon" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 页面 → network-first（登录状态需要实时）
  if (event.request.destination === "document") {
    event.respondWith(networkFirstPage(event.request));
    return;
  }

  // 其它（图片、字体等）→ stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return cached || new Response("", { status: 504 });
  }
}

async function networkFirstPage(request) {
  try {
    const res = await fetch(request);
    // 只缓存 200 响应
    if (res.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    // 离线 fallback：先看缓存，再看 offline 页
    const cached = await caches.match(request);
    if (cached) return cached;
    return (await caches.match(OFFLINE_URL)) ||
      new Response(offlineHtml(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

function offlineHtml() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>离线 · 雅思学习助手</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
        margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(135deg,#4f46e5 0%,#a855f7 100%);color:#fff;text-align:center;padding:24px}
      .box{max-width:400px}
      h1{font-size:32px;margin:0 0 8px;font-weight:800;letter-spacing:-0.02em}
      p{opacity:0.85;line-height:1.6}
      button{margin-top:16px;background:rgba(255,255,255,.15);border:0;color:#fff;
        padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600}
      button:hover{background:rgba(255,255,255,.25)}
    </style></head><body><div class="box">
    <h1>网络不可用</h1>
    <p>你现在处于离线状态。重新联网后再试。词汇模块的本地缓存内容仍可查看。</p>
    <button onclick="location.reload()">重新加载</button>
    </div></body></html>`;
}
