import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ManualBandsForm } from "@/components/assessment/manual-bands-form";
import { PencilLine, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManualAssessmentPage() {
  const { requireUser } = await import("@/lib/auth/session");
  if (!(await requireUser())) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in-slide">
      <PageHeader
        icon={PencilLine}
        title="填写已知分数"
        description="已经知道自己的雅思水平？直接填 5 维分数，跳过测试，立即生成报告和学习规划。"
      />

      <div className="rounded-lg border bg-brand-soft p-4 text-sm text-muted-foreground">
        按你最近一次真实考试或模考的分数填写。之后仍可随时回到评估页重新测试任意模块。
      </div>

      <ManualBandsForm />

      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/assessment">
            <ArrowLeft className="h-4 w-4" />
            返回，改用测试
          </Link>
        </Button>
      </div>
    </div>
  );
}
