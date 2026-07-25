/**
 * 5 维分数 → IELTS 0-9 band 映射
 *
 * 各维度都是根据"用户答对/表现"输出 0.5 精度的 band 分。
 * 这些系数来自剑桥官方评分锚定 + IELTS Liz 公开数据估算，
 * 不是官方精确算法（IELTS 内部算法不公开）。
 */

export type Bands = {
  vocab: number;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
};

/** 四舍五入到 0.5 */
export function toBand(raw: number): number {
  const b = Math.max(0, Math.min(9, raw));
  return Math.round(b * 2) / 2;
}

/**
 * 词汇 band：VST 频率带锚定。
 * band ≈ 用户仍掌握（≥阈值正确率）的最高频率带对应 band，带间线性插值。
 * 满分能到 8.5+，强弱可区分（旧的加权平均满分只有 6.5，有天花板 bug）。
 * 频率带→band 锚点：3000→5.0, 5000→6.5, 7000→7.5, 8500→8.5。用猜测校正后正确率插值。
 */
const VOCAB_LEVEL_BAND: Record<number, number> = { 3000: 5.0, 5000: 6.5, 7000: 7.5, 8500: 8.5 };
const VOCAB_ORDER = [3000, 5000, 7000, 8500];
const GUESS_BASELINE = 0.2; // 5 选 1

/** 猜测校正：5 选项下随机≈20%，扣除后归一化 */
function guessAdjust(acc: number): number {
  return Math.max(0, (acc - GUESS_BASELINE) / (1 - GUESS_BASELINE));
}

export function vocabBand(byLevel: { level: number; correct: number; total: number }[]): number {
  const accByLevel: Record<number, number> = {};
  for (const g of byLevel) {
    if (g.total > 0) accByLevel[g.level] = guessAdjust(g.correct / g.total);
  }
  if (Object.keys(accByLevel).length === 0) return 0;

  const MASTERY = 0.8; // 视为"掌握该带"的校正后正确率阈值
  let band = 4.0; // 3000 带以下的地板
  for (let i = 0; i < VOCAB_ORDER.length; i++) {
    const lv = VOCAB_ORDER[i];
    const acc = accByLevel[lv] ?? 0;
    const anchor = VOCAB_LEVEL_BAND[lv];
    const prevAnchor = i === 0 ? 4.0 : VOCAB_LEVEL_BAND[VOCAB_ORDER[i - 1]];
    if (acc >= MASTERY) {
      band = anchor; // 完全掌握该带，取锚点，继续看更高带
    } else {
      band = prevAnchor + (anchor - prevAnchor) * (acc / MASTERY); // 部分掌握：插值后停
      break;
    }
  }
  return toBand(band);
}

/** 频率带宽 + 词汇量估算（VST 频率带外推的近似，非官方精确值）*/
const BAND_SPAN: Record<number, number> = { 3000: 1000, 5000: 2000, 7000: 2000, 8500: 1500 };
const VOCAB_BASE = 2000;

export function estimateVocabSize(
  byLevel: { level: number; correct: number; total: number }[],
): { size: number; low: number; high: number } {
  const map = new Map(byLevel.map((g) => [g.level, g]));
  let size = 0;
  let variance = 0;
  const b3 = map.get(3000);
  const base3Acc = b3 && b3.total > 0 ? guessAdjust(b3.correct / b3.total) : 0;
  size += VOCAB_BASE * base3Acc;
  for (const lv of VOCAB_ORDER) {
    const g = map.get(lv);
    if (!g || g.total === 0) continue;
    const rawAcc = g.correct / g.total;
    const span = BAND_SPAN[lv];
    size += guessAdjust(rawAcc) * span;
    const p = Math.min(0.999, Math.max(0.001, rawAcc));
    variance += Math.pow(span, 2) * ((p * (1 - p)) / g.total);
  }
  const sd = Math.sqrt(variance);
  const round = (x: number) => Math.max(0, Math.round(x / 100) * 100);
  return { size: round(size), low: round(size - sd), high: round(size + sd) };
}

/**
 * 听力 / 阅读：按 IELTS 官方分数换算表估算（40 题制的按比例外推）
 * 参考剑桥官方 raw score → band conversion。
 */
const LR_BAND_TABLE: [threshold: number, band: number][] = [
  [1.0, 9.0],
  [0.95, 8.5],
  [0.9, 8.0],
  [0.85, 7.5],
  [0.75, 7.0],
  [0.7, 6.5],
  [0.6, 6.0],
  [0.5, 5.5],
  [0.4, 5.0],
  [0.3, 4.5],
  [0.2, 4.0],
  [0.15, 3.5],
  [0.1, 3.0],
  [0.05, 2.5],
  [0.0, 1.0],
];

export function listeningReadingBand(correct: number, total: number): number {
  if (total === 0) return 0;
  const acc = correct / total;
  for (const [t, b] of LR_BAND_TABLE) {
    if (acc >= t) return b;
  }
  return 0;
}

/** 写作 / 口语：4 维平均后取 0.5 */
export function writingBand(criteria: { tr: number; cc: number; lr: number; gra: number }): number {
  return toBand((criteria.tr + criteria.cc + criteria.lr + criteria.gra) / 4);
}

export function speakingBand(criteria: {
  fluency: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
}): number {
  return toBand(
    (criteria.fluency + criteria.vocabulary + criteria.grammar + criteria.pronunciation) / 4,
  );
}

/** overall 用官方 4 项均值 + 0.25/0.75 进位规则 */
export function overallBand(b: {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}): number {
  const avg = (b.listening + b.reading + b.writing + b.speaking) / 4;
  const decimals = avg - Math.floor(avg);
  if (decimals >= 0.75) return Math.floor(avg) + 1;
  if (decimals >= 0.25) return Math.floor(avg) + 0.5;
  return Math.floor(avg);
}

/** 每个维度的弱项描述（给报告页用）*/
export function bandFeedback(dim: keyof Bands, band: number): string {
  if (band === 0) return "此维度未参与测试。";
  const bucket = band < 5 ? "low" : band < 6.5 ? "mid" : band < 7.5 ? "good" : "excellent";
  const map: Record<keyof Bands, Record<string, string>> = {
    vocab: {
      low: "词汇量在 3000-4000 级，日常场景勉强够用，学术词汇薄弱。建议先攻克雅思核心 3500 词。",
      mid: "词汇量约 5000-6000，能应付大部分阅读听力，但写作口语的高分词汇不足。",
      good: "词汇量约 7000+，能理解学术文章大意，尝试掌握高级同义替换和搭配。",
      excellent: "词汇量优秀（8500+），继续保持并强化辨析和精准运用。",
    },
    listening: {
      low: "关键词捕捉与信息定位不熟练，需要从慢速材料 + 精听起步。",
      mid: "泛听能力已建立，需强化 Section 3-4 的学术场景（讨论、讲座）。",
      good: "能应对完整雅思听力，但个别细节题（选择/匹配）失分。",
      excellent: "听力接近 native 水平，重点保持速度与精度。",
    },
    reading: {
      low: "阅读速度慢，长难句解析有困难。先建立扫读 / 略读技巧。",
      mid: "能读完文章但时间紧张，题型技巧尚待打磨（尤其 T/F/NG、Matching）。",
      good: "阅读理解稳定，重点冲刺 Heading 题和推断题。",
      excellent: "阅读处于高分区，注意时间分配和难题稳定性。",
    },
    writing: {
      low: "词汇、句法基础较弱，先补基础语法和常用表达模板。",
      mid: "结构清晰但语言不够精准，重点提升 LR（词汇多样性）和 GRA（复杂句）。",
      good: "接近 7 分，需在 TR（任务回应完整度）和 CC（衔接自然度）上打磨。",
      excellent: "高分水平，重点是保持稳定 + 学习 8 分范文的精妙表达。",
    },
    speaking: {
      low: "流利度和词汇是主要瓶颈，先每天大声读 + 影子跟读。",
      mid: "能完成 P1，但 P2/P3 出现明显停顿或语言重复。练习话题拓展。",
      good: "接近 7 分，需要注意语法准确性和地道表达。",
      excellent: "口语流畅自然，注意保持并模拟真实考场压力。",
    },
  };
  return map[dim][bucket];
}
