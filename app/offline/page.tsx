"use client";

import { Button } from "@/components/ui/button";
import { WifiOff } from "lucide-react";

/** 离线时 Service Worker 会 fallback 到这里 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-gradient p-6 text-white">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">网络不可用</h1>
        <p className="mb-6 text-white/85">
          你现在处于离线状态。重新联网后再试。
        </p>
        <Button
          onClick={() => location.reload()}
          className="bg-white text-primary hover:bg-white/90"
        >
          重新加载
        </Button>
      </div>
    </div>
  );
}
