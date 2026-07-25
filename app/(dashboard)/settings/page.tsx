import Link from "next/link";
import { getEnv, providerReady } from "@/lib/env";
import { listProviders } from "@/lib/ai";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

export default async function SettingsPage() {
  const env = getEnv();
  const providers = listProviders();

  const bindings = [
    { kind: "text" as const, label: "文本生成 (写作批改 / 内容生成 / 规划)", current: env.AI_TEXT_PROVIDER, envKey: "AI_TEXT_PROVIDER" },
    { kind: "voice" as const, label: "TTS 语音合成 (单词发音 / 听力生成)", current: env.AI_VOICE_PROVIDER, envKey: "AI_VOICE_PROVIDER" },
    { kind: "stt" as const, label: "STT 语音识别 (口语转写)", current: env.AI_STT_PROVIDER, envKey: "AI_STT_PROVIDER" },
    { kind: "realtime" as const, label: "Realtime (口语实时对话)", current: env.AI_REALTIME_PROVIDER, envKey: "AI_REALTIME_PROVIDER" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="text-muted-foreground">AI Provider 切换 · 各能力可独立配置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI 能力绑定</CardTitle>
          <CardDescription>
            切换某项能力使用哪个 provider，只需修改 .env 里对应的环境变量后重启开发服务器。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {bindings.map((b) => {
            const ready = providerReady(b.kind);
            return (
              <div key={b.kind} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">{b.label}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <code className="rounded bg-muted px-1.5 py-0.5">{b.envKey}={b.current}</code>
                    {ready ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> 已配置
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> 缺少 API Key
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>已注册的 Provider</CardTitle>
          <CardDescription>每个 provider 支持的能力（不支持的能力会在运行时报错）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {providers.map((p) => (
              <div key={p.name} className="rounded-lg border p-3">
                <div className="mb-1 font-medium capitalize">{p.name}</div>
                <div className="flex flex-wrap gap-1">
                  {p.capabilities.map((c) => (
                    <span key={c} className="rounded bg-secondary px-2 py-0.5 text-xs">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>健康检查</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/api/health" target="_blank">
              打开 /api/health
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
