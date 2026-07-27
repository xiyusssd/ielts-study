"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type RenderedQ = {
  id: string;
  index: number;
  type: "tfng" | "mcq" | "matching" | "gapfill" | "heading";
  prompt: string;
  options: string[] | Record<string, string> | null;
};

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];

export function QuestionRenderer({
  q,
  value,
  onChange = () => {},
  reviewMode,
  correctAnswer,
  explanation,
  ok,
}: {
  q: RenderedQ;
  value: string;
  onChange?: (v: string) => void;
  reviewMode?: boolean;
  correctAnswer?: string;
  explanation?: string;
  ok?: boolean;
}) {
  // review 模式优先用服务端判分结果(含 accept 变体/标点归一),
  // 仅在未提供时退回本地归一比较,避免与顶部统计自相矛盾。
  const isCorrect =
    reviewMode && value
      ? ok ?? (!!correctAnswer && normalizeAnswer(value) === normalizeAnswer(correctAnswer))
      : false;
  const isWrong = reviewMode && value && !isCorrect;

  return (
    <div
      className={cn(
        "space-y-2 border-b pb-4 last:border-b-0",
        reviewMode && isCorrect && "opacity-90",
        reviewMode && isWrong && "bg-red-50 dark:bg-red-900/10 -mx-2 rounded-md px-2 py-2",
      )}
    >
      <div className="text-sm">
        <span className="mr-2 font-mono text-muted-foreground">{q.index}.</span>
        {q.prompt}
      </div>

      {q.type === "tfng" && (
        <ChoiceButtons
          options={Array.isArray(q.options) && q.options.length ? (q.options as string[]) : TFNG_OPTIONS}
          value={value}
          onChange={onChange}
          disabled={reviewMode}
          compact
        />
      )}

      {q.type === "mcq" && (
        <ChoiceLetters
          options={q.options as string[] | null}
          value={value}
          onChange={onChange}
          disabled={reviewMode}
        />
      )}

      {q.type === "heading" && (
        <ChoiceHeadings
          options={q.options as Record<string, string> | null}
          value={value}
          onChange={onChange}
          disabled={reviewMode}
        />
      )}

      {q.type === "gapfill" && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="填答案"
          className="max-w-xs"
          disabled={reviewMode}
        />
      )}

      {q.type === "matching" && (
        <ChoiceLetters
          options={q.options as string[] | null}
          value={value}
          onChange={onChange}
          disabled={reviewMode}
        />
      )}

      {reviewMode && (
        <div className="mt-1 space-y-0.5 text-xs">
          <div>
            正确答案：<span className="font-mono font-semibold text-green-700 dark:text-green-500">{correctAnswer}</span>
            {value && !isCorrect && (
              <span className="ml-3 text-red-600">
                你的答案：<span className="font-mono">{value || "(未答)"}</span>
              </span>
            )}
          </div>
          {explanation && <div className="text-muted-foreground">解析：{explanation}</div>}
        </div>
      )}
    </div>
  );
}

function ChoiceButtons({
  options,
  value,
  onChange,
  disabled,
  compact,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const picked = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => !disabled && onChange(opt)}
            disabled={disabled}
            className={cn(
              "rounded-md border px-3 py-1 font-mono transition-colors disabled:cursor-not-allowed disabled:opacity-70",
              compact ? "text-xs" : "text-sm",
              picked ? "border-primary bg-primary/10 font-semibold" : "hover:bg-muted",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ChoiceLetters({
  options,
  value,
  onChange,
  disabled,
}: {
  options: string[] | null;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (!options) return null;
  // 部分剑桥题(人名/段落配对)选项文本已内嵌字母,如 "A (Roger Angel)"。
  // 整组都内嵌时剥离,避免与位置字母重复显示成 "A. A (Roger Angel)"。
  const allPrefixed = options.every((o, i) =>
    new RegExp(`^${String.fromCharCode(65 + i)}[\\s.)]`).test(o),
  );
  return (
    <div className="space-y-1">
      {options.map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const picked = value === letter;
        const text = allPrefixed ? opt.replace(/^[A-H][\s.)]\s*/, "") : opt;
        return (
          <button
            key={i}
            type="button"
            onClick={() => !disabled && onChange(letter)}
            disabled={disabled}
            className={cn(
              "block w-full rounded-md border p-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-70",
              picked ? "border-primary bg-primary/5" : "hover:bg-muted",
            )}
          >
            <span className="mr-2 font-mono text-muted-foreground">{letter}.</span>
            {text}
          </button>
        );
      })}
    </div>
  );
}

function ChoiceHeadings({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Record<string, string> | null;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (!options) return null;
  return (
    <div className="space-y-1">
      {Object.entries(options).map(([key, text]) => {
        const picked = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => !disabled && onChange(key)}
            disabled={disabled}
            className={cn(
              "block w-full rounded-md border p-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-70",
              picked ? "border-primary bg-primary/5" : "hover:bg-muted",
            )}
          >
            <span className="mr-2 font-mono text-muted-foreground">{key}.</span>
            {text}
          </button>
        );
      })}
    </div>
  );
}

function normalizeAnswer(a: string): string {
  return a.trim().toLowerCase().replace(/\s+/g, " ");
}
