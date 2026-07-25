"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { signup } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = await signup(fd);
      if (res && "ok" in res && !res.ok) {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">开始学习</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          创建账号，让 AI 为你规划专属备考路径
        </p>
      </div>

      <Card>
        <form action={onSubmit}>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" name="password" type="password" placeholder="至少 6 位" required minLength={6} autoComplete="new-password" />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={pending}>
              {pending ? "创建中..." : "创建账号"}
            </Button>
            <p className="text-xs text-muted-foreground">
              注册即代表你同意本地数据存储 · 无第三方追踪
            </p>
          </CardContent>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        已有账号？{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          直接登录
        </Link>
      </p>
    </div>
  );
}
