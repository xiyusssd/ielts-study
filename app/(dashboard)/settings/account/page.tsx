import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { DeleteAccountForm } from "@/components/account/delete-account-form";
import { ArrowLeft, Download, Shield, Trash2, User } from "lucide-react";

export default async function AccountSettingsPage() {
  const user = await requireUser();
  if (!user) return null;

  const [profile, stats] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    Promise.all([
      prisma.vocabProgress.count({ where: { userId: user.id } }),
      prisma.attempt.count({ where: { userId: user.id } }),
      prisma.writingSubmission.count({ where: { userId: user.id } }),
      prisma.speakingSession.count({ where: { userId: user.id } }),
    ]),
  ]);
  const [vocabCount, attempts, writings, speakings] = stats;

  return (
    <div className="space-y-6 animate-in-slide">
      <Button asChild variant="ghost" size="sm">
        <Link href="/settings">
          <ArrowLeft className="h-4 w-4" /> 返回设置
        </Link>
      </Button>

      <PageHeader
        icon={User}
        title="账户中心"
        description="管理账号 · 修改密码 · 导出数据 · 删除账号"
        gradient
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">账号信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">邮箱</span>
            <span className="font-mono">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">注册时间</span>
            <span>{profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString("zh-CN") : "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">学习数据</span>
            <span>{vocabCount} 词 · {attempts} 做题 · {writings} 写作 · {speakings} 口语</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            修改密码
          </CardTitle>
          <CardDescription>至少 8 位 · 需包含字母和数字</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-primary" />
            导出数据
          </CardTitle>
          <CardDescription>下载你的所有学习记录 (JSON 格式)</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/api/account/export" download={`ielts-data-${new Date().toISOString().slice(0, 10)}.json`}>
              <Download className="h-4 w-4" />
              下载我的数据
            </a>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            符合 GDPR 数据可携带原则 · 包含账户、评估、计划、学习记录
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" />
            删除账号
          </CardTitle>
          <CardDescription>永久删除账户和所有学习数据 · 不可撤销</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm email={user.email} />
        </CardContent>
      </Card>
    </div>
  );
}
