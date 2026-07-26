import {
  VOCAB_LEVELS,
  NONE_OF_ABOVE,
  type VocabOption,
  type GenVocabQ,
} from "@/lib/assessment/vocab-types";
import bankData from "@/lib/assessment/data/vocab-bank.json";

/** 打包词库（ECDICT 开源，真实 COCA 词频分级 + 三维分类）*/
type BankWord = {
  word: string;
  ipa: string | null;
  level: number;
  meaning: string;
  pos?: string | null;
  cefr?: string | null;
  sources?: string[];
  topics?: string[];
};
const BANK = bankData as BankWord[];

/** 每级抽题数（等量，避免加权失衡）*/
const PER_LEVEL = 8;
/** 约此比例的题「省略正确义」→「以上都不正确」为正解 */
const NONE_CORRECT_RATIO = 0.2;

/** 归一化释义为 token 集合，用于碰撞检测 */
function meaningTokens(meaning: string): Set<string> {
  return new Set(
    meaning
      .replace(/[（(].*?[)）]/g, "")
      .split(/[、，,;；/／\s]+/)
      .map((t) => t.trim())
      .filter(Boolean),
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/** 候选释义是否与目标词释义碰撞（token 重叠）*/
function collides(candidate: string, targetTokens: Set<string>): boolean {
  for (const tok of meaningTokens(candidate)) if (targetTokens.has(tok)) return true;
  return false;
}

/**
 * 从打包词库采样生成词汇题。每级 PER_LEVEL 题，等量。
 * 干扰项取自其它词的释义（带 fromWord）；约 20% 题省略正确义 →「以上都不正确」为正解。
 */
export function generateVocabQuestions(): GenVocabQ[] {
  const questions: GenVocabQ[] = [];

  for (const level of VOCAB_LEVELS) {
    const pool = BANK.filter((w) => w.level === level);
    const targets = sample(pool, Math.min(PER_LEVEL, pool.length));

    for (let qi = 0; qi < targets.length; qi++) {
      const target = targets[qi];
      const targetTokens = meaningTokens(target.meaning);
      const noneCorrect = Math.random() < NONE_CORRECT_RATIO;

      // 3 个不碰撞、互不相同、来自不同词的干扰项（跨级取，多样性更好）
      const distractors: VocabOption[] = [];
      const usedWords = new Set<string>([target.word]);
      const usedTexts = new Set<string>([target.meaning]);
      for (const cand of shuffle(BANK)) {
        if (distractors.length >= 4) break; // 多取一个备用（none 情形要 4 个）
        if (usedWords.has(cand.word) || usedTexts.has(cand.meaning)) continue;
        if (collides(cand.meaning, targetTokens)) continue;
        distractors.push({ text: cand.meaning, fromWord: cand.word });
        usedWords.add(cand.word);
        usedTexts.add(cand.meaning);
      }
      if (distractors.length < 4) continue; // 兜底：候选不足跳过

      let realOptions: VocabOption[];
      if (noneCorrect) {
        realOptions = distractors.slice(0, 4); // 全是干扰项 → 正解为「以上都不正确」
      } else {
        realOptions = [{ text: target.meaning, fromWord: target.word }, ...distractors.slice(0, 3)];
      }

      const shuffledReal = shuffle(realOptions);
      const options: VocabOption[] = [...shuffledReal, { text: NONE_OF_ABOVE }];
      const answer = noneCorrect
        ? options.length - 1
        : shuffledReal.findIndex((o) => o.text === target.meaning && o.fromWord === target.word);

      questions.push({
        id: `${level}-${qi}-${target.word}`,
        level: level,
        word: target.word,
        ipa: target.ipa,
        pos: target.pos ?? null,
        cefr: target.cefr ?? null,
        options,
        answer,
      });
    }
  }

  return shuffle(questions);
}
