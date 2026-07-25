import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            雅思学习助手
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">服务条款</Link>
            <Link href="/privacy" className="hover:text-foreground">隐私政策</Link>
            <Link href="/help" className="hover:text-foreground">帮助</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          {children}
        </article>
      </main>
    </div>
  );
}
