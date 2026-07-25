import { Sparkles, Brain, Target, TrendingUp } from "lucide-react";

const highlights = [
  { icon: Sparkles, title: "AI 4 维批改", desc: "写作口语实时获得 TR/CC/LR/GRA 分数" },
  { icon: Brain, title: "FSRS 智能记忆", desc: "词汇按记忆曲线复习，效率翻倍" },
  { icon: Target, title: "个性化规划", desc: "按目标 + 时间生成周计划，考试倒计时提醒" },
  { icon: TrendingUp, title: "全维度追踪", desc: "5 维雷达图 · 成绩趋势 · 连续学习天数" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* 左侧品牌宣传 */}
      <div className="relative hidden overflow-hidden bg-brand-gradient lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-white">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-10" />

        <div className="relative">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg">雅思学习助手</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              AI 驱动的
              <br />
              雅思备考平台
            </h1>
            <p className="mt-3 text-lg text-white/80">
              5 维水平诊断 · 个性化规划 · 5 大模块闭环训练
            </p>
          </div>
          <div className="grid gap-3">
            {highlights.map((h) => {
              const Icon = h.icon;
              return (
                <div key={h.title} className="flex items-start gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{h.title}</div>
                    <div className="text-sm text-white/70">{h.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative text-xs text-white/60">
          © 2026 · 数据全本地存储 · 支持 Docker · 一键 OrbStack 部署
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex min-h-screen flex-col justify-center bg-muted/30 p-6 lg:p-12">
        <div className="mx-auto w-full max-w-md space-y-6 animate-in-slide">
          {/* 移动端 Logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold">雅思学习助手</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
