"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => console.error(error), [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-2xl font-semibold">出错了</h2>
        <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
        <Button onClick={reset}>重试</Button>
      </div>
    </div>
  );
}
