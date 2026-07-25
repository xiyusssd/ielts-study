"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, X } from "lucide-react";

/**
 * PWA 引导组件：
 * 1. 页面首次加载注册 Service Worker
 * 2. 监听 beforeinstallprompt 事件，暴露"安装到桌面"提示
 */
export function PWAInit() {
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 注册 Service Worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .catch((err) => console.warn("SW register failed:", err));
      });
    }

    // 监听可安装事件
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // 检查是否已经从 PWA 打开
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const alreadyDismissed = localStorage.getItem("pwa-install-dismissed") === "1";
    if (isStandalone || alreadyDismissed) setDismissed(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!installEvent) return;
    // @ts-expect-error beforeinstallprompt custom event
    const result = await installEvent.prompt();
    if (result?.outcome === "accepted") {
      toast.success("已安装到桌面！从 Launchpad 或应用文件夹打开");
      setInstallEvent(null);
    }
  }

  function dismiss() {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  }

  if (!installEvent || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border bg-card p-4 shadow-card animate-in-slide">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">安装到桌面</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            像原生应用一样打开雅思学习助手，支持离线使用
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={install}
              className="rounded-md bg-brand-gradient px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              立即安装
            </button>
            <button
              onClick={dismiss}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              以后再说
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
