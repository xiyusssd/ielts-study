"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

/** 模块级 error boundary UI · 各模块 error.tsx 复用 */
export function ModuleError({
  error,
  reset,
  module,
}: {
  error: Error;
  reset: () => void;
  module: string;
}) {
  useEffect(() => {
    console.error(`[${module}]`, error);
  }, [error, module]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold">{module} 模块出错了</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{error.message.slice(0, 200)}</p>
      <Button onClick={reset} className="mt-4">
        <RefreshCw className="h-4 w-4" /> 重试
      </Button>
    </div>
  );
}
