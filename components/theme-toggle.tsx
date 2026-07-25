"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** 简易 dark mode 切换（写入 localStorage + <html> class） */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "light" | "dark" | null) ?? getSystemTheme();
    applyTheme(saved);
    setTheme(saved);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    applyTheme(next);
    setTheme(next);
    localStorage.setItem("theme", next);
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors",
        className,
      )}
      title={theme === "light" ? "切换到深色" : "切换到浅色"}
      aria-label="切换主题"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: "light" | "dark") {
  const el = document.documentElement;
  if (t === "dark") el.classList.add("dark");
  else el.classList.remove("dark");
}
