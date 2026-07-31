"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Headphones,
  Home,
  Languages,
  Mic,
  Pen,
  Settings,
  Sparkles,
  Target,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

const COLLAPSE_KEY = "sidebar-collapsed";

const navItems = [
  { href: "/", label: "总览", icon: Home, exact: true },
  { href: "/assessment", label: "水平测试", icon: Sparkles },
  { href: "/plan", label: "学习计划", icon: Target },
  { href: "/vocab", label: "词汇", icon: Languages },
  { href: "/reading", label: "阅读", icon: BookOpen },
  { href: "/listening", label: "听力", icon: Headphones },
  { href: "/writing", label: "写作", icon: Pen },
  { href: "/speaking", label: "口语", icon: Mic },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // 读取上次折叠状态
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border/60 bg-card/90 backdrop-blur-xl transition-[width] duration-200",
        collapsed ? "w-16" : "w-68",
      )}
    >
      <div className={cn("flex items-center gap-2 border-b border-border/60 p-4", collapsed && "justify-center px-2")}>
        <Link href="/" className="group flex min-w-0 items-center gap-3 font-semibold" title="雅思学习助手">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate leading-tight">雅思学习助手</span>
              <span className="text-[10px] font-normal text-muted-foreground">IELTS Study</span>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="收起侧边栏"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="展开侧边栏"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <nav className={cn("flex-1 space-y-1 overflow-y-auto p-3", collapsed && "px-2")}>
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all",
                collapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-primary/10 text-primary shadow-soft"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {active && !collapsed && (
                <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-brand-gradient" />
              )}
              <Icon className={cn("h-4 w-4 shrink-0 transition-transform", active && "text-primary", !active && "group-hover:scale-110")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-2 border-t p-3", collapsed && "px-2")}>
        <Link
          href="/settings"
          title={collapsed ? "设置" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors",
            collapsed ? "justify-center px-0" : "px-3",
            pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary shadow-soft"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>设置</span>}
        </Link>

        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white"
              title={email}
            >
              {email.slice(0, 1).toUpperCase()}
            </div>
            <ThemeToggle className="h-7 w-7" />
            <form action={logout}>
              <button
                type="submit"
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
                title="退出登录"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
              {email.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{email}</div>
            </div>
            <ThemeToggle className="h-7 w-7" />
            <form action={logout}>
              <button
                type="submit"
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
                title="退出登录"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
