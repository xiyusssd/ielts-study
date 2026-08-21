"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAiSettings } from "@/lib/ai/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Brain,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";

type ModelInfo = {
  id: string;
  contextLength?: number;
  pricing?: { currency: string; inputPerM?: number; outputPerM?: number };
  supportsTools?: boolean;
  supportsVision?: boolean;
};

type Saved = { baseUrl: string; apiKey: string; model: string };
type Effective = { baseUrl: string; model: string; apiKeyFromEnv: boolean };

type GetResponse =
  | {
      models: ModelInfo[];
      current: string;
      provider: string;
      effective: Effective;
      saved: Saved;
      warning?: string;
    }
  | { error: string };

const SORT_PRIORITY = (id: string) => {
  if (id.includes("deepseek")) return 0;
  if (id.includes("glm") || id.includes("qwen")) return 1;
  if (id.includes("kimi")) return 2;
  return 3;
};

export function AiProviderConfig() {
  const router = useRouter();
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [effective, setEffective] = useState<Effective | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [pending, start] = useTransition();
  const loaded = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/ai/models", { cache: "no-store" });
      const data = (await res.json()) as GetResponse;
      if (!res.ok || "error" in data) {
        setError("error" in data ? data.error : `HTTP ${res.status}`);
        setModels((prev) => prev ?? []);
        return;
      }
      const sorted = [...data.models].sort((a, b) => SORT_PRIORITY(a.id) - SORT_PRIORITY(b.id));
      setModels(sorted);
      setSaved(data.saved);
      setEffective(data.effective);
      setBaseUrl(data.saved.baseUrl);
      setApiKey(data.saved.apiKey);
      setSel(data.current || null);
      // 模型列表拉取失败不阻塞表单：显示 warning 提示，但表单与保存按钮保持可用
      if (data.warning) setError(data.warning);
    } catch {
      setError("网络错误，无法获取 AI 配置");
    }
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void load();
  }, [load]);

  const fetchModels = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { models?: ModelInfo[] } | { error: string };
      if (!res.ok || "error" in data) {
        setError("error" in data ? data.error : `HTTP ${res.status}`);
        return;
      }
      if (!data.models || data.models.length === 0) {
        setError("网关未返回任何模型");
        return;
      }
      const sorted = [...data.models].sort((a, b) => SORT_PRIORITY(a.id) - SORT_PRIORITY(b.id));
      setModels(sorted);
      toast.success(`已获取 ${sorted.length} 个模型`, {
        description: "选择一个模型后点「保存配置」生效",
      });
    } catch {
      setError("网络错误，无法连接网关");
    } finally {
      setFetching(false);
    }
  }, [baseUrl, apiKey]);

  const dirty =
    saved !== null &&
    effective !== null &&
    (baseUrl.trim() !== saved.baseUrl ||
      apiKey.trim() !== saved.apiKey ||
      (sel ?? "") !== effective.model);

  function save() {
    if (saved === null || effective === null) return;
    start(async () => {
      // 模型未变化时保留 profile 原值（"" 表示继续用 env 回退），避免把 env 默认值冻结进数据库
      const model = sel && sel !== effective.model ? sel : saved.model || null;
      const res = await saveAiSettings({
        baseUrl: baseUrl.trim() || null,
        apiKey: apiKey.trim() || null,
        model,
      });
      if (res.ok) {
        toast.success("AI 服务配置已保存", { description: "写作/口语批改、AI 例句、小故事等立即生效" });
        router.refresh();
        await load();
      } else {
        toast.error(res.error);
      }
    });
  }

  function resetToDefault() {
    start(async () => {
      const res = await saveAiSettings({ baseUrl: null, apiKey: null, model: null });
      if (res.ok) {
        toast.success("已恢复默认配置（.env）");
        setBaseUrl("");
        setApiKey("");
        router.refresh();
        await load();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 网关凭据 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ai-base-url" className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            Base URL
          </Label>
          <Input
            id="ai-base-url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={effective?.baseUrl ?? "https://api.openai.com/v1"}
            spellCheck={false}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            OpenAI 兼容网关地址，留空使用 .env 配置（{effective?.baseUrl ?? "默认 OpenAI"}）
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-api-key" className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
            API Key
          </Label>
          <div className="relative">
            <Input
              id="ai-api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={effective?.apiKeyFromEnv ? "已配置（.env），留空不覆盖" : "sk-..."}
              spellCheck={false}
              autoComplete="off"
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showKey ? "隐藏 Key" : "显示 Key"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Key 仅保存在本地数据库，不会回传 env 之外的任何服务
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void fetchModels()} disabled={fetching || pending}>
          <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
          {fetching ? "拉取中…" : "拉取模型列表"}
        </Button>
        <Button size="sm" onClick={save} disabled={pending || !dirty}>
          <Save className="h-4 w-4" />
          保存配置
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetToDefault}
          disabled={pending || (saved !== null && !saved.baseUrl && !saved.apiKey && !saved.model)}
        >
          <RotateCcw className="h-4 w-4" />
          恢复默认
        </Button>
        <span className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
          <Brain className="h-4 w-4 text-primary" />
          生效优先级：设置页 &gt; .env
        </span>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {models === null && !error && (
        <p className="text-sm text-muted-foreground">正在获取模型列表…</p>
      )}

      {models !== null && models.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            选择模型
            {effective && (
              <span className="font-normal text-muted-foreground">
                · 当前生效：
                <code className="ml-1 rounded bg-muted px-1.5 py-0.5">{effective.model}</code>
              </span>
            )}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {models.map((m) => {
              const active = sel === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSel(m.id)}
                    disabled={pending}
                    aria-pressed={active}
                    className={
                      "w-full rounded-lg border p-3 text-left transition-all disabled:opacity-60 " +
                      (active ? "border-primary bg-primary/10 shadow-soft" : "border-border/60 hover:bg-muted")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{m.id}</span>
                      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {m.contextLength != null && (
                        <Badge variant="outline">{formatCtx(m.contextLength)} 上下文</Badge>
                      )}
                      {m.pricing && (
                        <Badge variant="outline">
                          ¥{fmt(m.pricing.inputPerM)} / ¥{fmt(m.pricing.outputPerM)} 每百万
                        </Badge>
                      )}
                      {m.supportsTools && <Badge variant="secondary">tools</Badge>}
                      {m.supportsVision && <Badge variant="secondary">vision</Badge>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatCtx(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

function fmt(n?: number): string {
  if (n == null || !Number.isFinite(n)) return "?";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}