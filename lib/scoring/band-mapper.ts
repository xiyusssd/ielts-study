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
 * 词汇：按用户在 4 个等级（3000/5000/7000/8500）的正确率估算。
 * 每级 8 题以内，等级正确率 x 该级对应 band 中点。
 */
export function vocabBand(byLevel: { level: number; correct: number; total: number }[]): number {
  const targets: Record<number, number> = { 3000: 5.0, 5000: 6.0, 7000: 7.0, 8500: 8.0 };
  let sum = 0;
  let weight = 0;
  for (const g of byLevel) {
    if (g.total === 0) continue;
    const acc = g.correct / g.total;
    const target = targets[g.level] ?? 6.0;
    sum += acc * target * g.total;
    weight += g.total;
  }
  if (weight === 0) return 0;
  return toBand(sum / weight);
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
