"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changePassword } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = await changePassword(fd);
      if (res.ok) {
        toast.success(res.message ?? "密码已更新");
        (document.getElementById("change-pw-form") as HTMLFormElement)?.reset();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <form id="change-pw-form" action={onSubmit} className="space-y-3 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="current">当前密码</Label>
        <Input id="current" name="current" type="password" required autoComplete="current-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">新密码</Label>
        <Input id="next" name="next" type="password" required autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">至少 8 位 · 需包含字母和数字</p>
      </div>
      {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
      <Button type="submit" disabled={pending}>
        {pending ? "更新中..." : "更新密码"}
      </Button>
    </form>
  );
}
