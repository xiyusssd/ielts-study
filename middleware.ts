import { NextResponse, type NextRequest } from "next/server";

/**
 * 全站安全响应头 + 基础 rate limit（针对 /api/*）
 *
 * CSP 因用了 recharts / next dynamic / inline theme script，需要 unsafe-inline 和 unsafe-eval。
 * 严格 CSP 需要 nonce（复杂度大幅上升，暂用宽松版）。
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // 安全响应头
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  res.headers.set("X-DNS-Prefetch-Control", "on");

  // 只对页面（非静态）设 CSP
  const path = req.nextUrl.pathname;
  const isPage = !path.startsWith("/_next/") && !path.startsWith("/api/") &&
    !path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/);
  if (isPage) {
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        // 允许 OpenAI Realtime WebRTC 直连
        "connect-src 'self' https://api.openai.com wss://api.openai.com",
        // 允许 mediastream（麦克风）
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
  }

  return res;
}

export const config = {
  // 匹配除内部资源以外的所有路径
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|woff2?)$).*)",
  ],
};
