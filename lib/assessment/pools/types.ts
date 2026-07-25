/** 阅读/听力题库的共享类型 + 判分（按 value 判分，避开位置字母陷阱）*/

export type PoolQ = {
  id: string;
  type: "tfng" | "mcq" | "gapfill";
  prompt: string;
  options?: string[]; // mcq 用；判分按选项文本，不按位置
  answer: string;     // tfng: TRUE/FALSE/NOT GIVEN · mcq: 正确选项文本 · gapfill: 答案词
  accept?: string[];  // gapfill 备选正确答案（如 brain/brains, behaviour/behavior）
};

export type ReadingSet = {
  id: string;
  title: string;
  content: string;
  questions: PoolQ[];
};

export type ListeningSet = {
  id: string;
  title: string;
  // 脚本按说话人分段，用于分角色 TTS
  lines: { speaker: "W" | "M" | "N"; text: string }[];
  questions: PoolQ[];
};

/** 归一化答案后比较（大小写、空白、TRUE/T 等）*/
export function normalizeAnswer(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.。]$/, "");
}

/** 判分：用户答案 value vs 正确 value（含备选答案）*/
export function isCorrect(userAnswer: string | undefined, correct: string, accept?: string[]): boolean {
  if (userAnswer == null) return false;
  const user = normalizeAnswer(userAnswer);
  if (user === normalizeAnswer(correct)) return true;
  return (accept ?? []).some((alt) => user === normalizeAnswer(alt));
}

/** 整段脚本纯文本（fallback 显示原文）*/
export function scriptText(set: ListeningSet): string {
  const label: Record<string, string> = { W: "Woman", M: "Man", N: "Narrator" };
  return set.lines.map((l) => `${label[l.speaker]}: ${l.text}`).join("\n\n");
}
