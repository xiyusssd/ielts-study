"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAccount } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountForm({ email }: { email: string }) {
  const [confirmed, setConfirmed] = useState("");
  const [pending, start] = useTransition();

  const isValid = confirmed === email;

  function onSubmit(fd: FormData) {
    if (!isValid) return;
    if (!confirm("最后确认：删除后所有学习数据将不可恢复。继续？")) return;
    start(async () => {
      const res = await deleteAccount(fd);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-3 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="confirm">输入 <code className="font-mono">{email}</code> 确认删除</Label>
        <Input
          id="confirm"
          name="confirm"
          type="email"
          placeholder={email}
          value={confirmed}
          onChange={(e) => setConfirmed(e.target.value)}
          required
        />
      </div>
      <Button
        type="submit"
        variant="destructive"
        disabled={!isValid || pending}
      >
        {pending ? "删除中..." : "永久删除账号"}
      </Button>
    </form>
  );
}
