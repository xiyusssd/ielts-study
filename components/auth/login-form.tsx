"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { login } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const res = await login(fd);
        if (res && "ok" in res && !res.ok) {
          setError(res.error);
          toast.error(res.error);
        }
      } catch (err) {
        // 旧 Service Worker 缓存的过期 client 会调用新 server 不存在的 action ID，
        // 触发 "Failed to find Server Action"。此时清缓存 + 注销 SW 后重载即可自愈。
        const msg = err instanceof Error ? err.message : String(err);
        if (/Server Action|deployment/i.test(msg)) {
          try {
            if ("serviceWorker" in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister()));
            }
            if ("caches" in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
          } finally {
            location.reload();
          }
          return;
        }
        setError("登录出错，请重试");
        toast.error("登录出错，请重试");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">欢迎回来</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          登录继续你的雅思备考之旅
        </p>
      </div>

      <Card>
        {/* method="post" 是未 hydrate 时的兜底：此时点提交会走浏览器原生提交，
            缺省的 GET 会把密码拼进 URL（进浏览器历史与访问日志）。 */}
        <form method="post" onSubmit={onSubmit}>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={pending}>
              {pending ? "登录中..." : "登录"}
            </Button>
          </CardContent>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        没有账号？{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          立即注册
        </Link>
      </p>
    </div>
  );
}
