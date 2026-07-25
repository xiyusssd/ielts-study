"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

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

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-card">
      <div className="border-b p-4">
        <Link href="/" className="flex items-center gap-2.5 font-semibold group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight">雅思学习助手</span>
            <span className="text-[10px] font-normal text-muted-foreground">IELTS Study</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-primary/10 text-primary shadow-soft"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 transition-transform", active && "text-primary", !active && "group-hover:scale-110")} />
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t p-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          <span>设置</span>
        </Link>

        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
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
      </div>
    </aside>
  );
}
