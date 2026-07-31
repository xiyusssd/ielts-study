"use client";

// 把"期望答案"渲染成每词一条横线：宽度按词长自适应，输入实时显示在横线上，
// 检查后整词红/绿。caret 是隐藏输入里的真实光标位置(selectionStart)，
// 用它定位高亮词 + 词内光标，方向键左右移动光标时显示同步跟随。

const isLetter = (c: string) => /[A-Za-z0-9]/.test(c);
const lettersOf = (s: string) => [...s].filter(isLetter);
const normWord = (s: string) => lettersOf(s).join("").toLowerCase();

// 按空白把输入切成词，并根据光标位置算出「当前词」和「词内偏移」
function analyze(typed: string, caret: number) {
  const tokens: string[] = [];
  const spans: [number, number][] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(typed))) {
    tokens.push(m[0]);
    spans.push([m.index, m.index + m[0].length]);
  }
  let activeWord = tokens.length; // 落在末尾空白 → 指向下一个新词
  let offset = 0;
  for (let i = 0; i < spans.length; i++) {
    const [s, e] = spans[i];
    if (caret <= e) {
      activeWord = i;
      offset = caret >= s ? caret - s : 0;
      break;
    }
  }
  return { tokens, activeWord, offset };
}

export function AnswerSheet({
  expectedWords,
  typed,
  caret,
  checked,
  focused = false,
  size = "md",
}: {
  expectedWords: string[];
  typed: string;
  caret: number;
  checked: boolean;
  focused?: boolean;
  size?: "md" | "lg";
}) {
  const { tokens, activeWord, offset } = analyze(typed, caret);

  const dims =
    size === "lg"
      ? { text: "text-3xl", line: "min-h-[2.75rem] pb-1.5", gap: "gap-x-5 gap-y-6", cursor: "h-8" }
      : { text: "text-2xl", line: "min-h-[2.25rem] pb-1", gap: "gap-x-4 gap-y-5", cursor: "h-7" };

  const overflow = tokens.slice(expectedWords.length);
  const overflowActive = activeWord - expectedWords.length;

  // 当前词把 token 从光标处切开，中间插一根闪烁竖线
  const content = (token: string, active: boolean) => {
    if (!(active && !checked && focused)) return token;
    return (
      <>
        {token.slice(0, offset)}
        <span className={`inline-block w-[2px] animate-pulse self-end bg-primary ${dims.cursor}`} />
        {token.slice(offset)}
      </>
    );
  };

  return (
    <div className={`flex flex-wrap items-end justify-center ${dims.gap} ${dims.text}`}>
      {expectedWords.map((word, wi) => {
        const token = tokens[wi] ?? "";
        const active = focused && !checked && wi === activeWord;

        let color = "text-foreground";
        if (checked && token.length > 0) {
          color = normWord(token) === normWord(word) ? "text-success" : "text-destructive";
        }

        return (
          <span
            key={wi}
            className={`flex items-end justify-center border-b-2 font-semibold transition-colors ${dims.line} ${
              active ? "border-primary" : token.length > 0 ? "border-foreground/40" : "border-border"
            } ${color}`}
            style={{ minWidth: `${Math.max(word.length, 2) * 0.62 + 0.5}em` }}
          >
            <span className="inline-flex items-end px-1">{content(token, active)}</span>
          </span>
        );
      })}

      {overflow.map((token, i) => {
        const active = focused && !checked && i === overflowActive;
        return (
          <span
            key={`ov-${i}`}
            className={`flex items-end justify-center border-b-2 border-destructive/50 font-semibold text-destructive ${dims.line}`}
            style={{ minWidth: `${Math.max(token.length, 2) * 0.62 + 0.5}em` }}
          >
            <span className="inline-flex items-end px-1">{content(token, active)}</span>
          </span>
        );
      })}
    </div>
  );
}
