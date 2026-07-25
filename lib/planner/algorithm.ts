import type { Bands } from "@/lib/scoring/band-mapper";

export type PlannerInput = {
  current: Bands;
  targets: {
    overall: number;
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  };
  examDate: Date;
  weeklyHours: number;
};

export type ModuleName = "vocab" | "listening" | "reading" | "writing" | "speaking";

export type WeekAllocation = {
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  focus: Record<ModuleName, number>; // 每模块本周小时数
  hasMock: boolean; // 周末是否有 mini-mock
};

export type DailyTaskInput = {
  date: Date;
  module: ModuleName;
  minutes: number;
  contentType: string;
  description: string;
};

/**
 * 主规划算法。规则版（P1 用规则；未来需要复杂案例可路由到 GPT-4o）。
 *
 * 思路：
 * 1. 计算每维 gap = target - current，负数归 0
 * 2. gap × 难度系数（提高每 0.5 分需 15-40 小时）= 该维总需时
 * 3. 词汇按听说读写四项的均值补一份（vocab 是基础，独立追踪）
 * 4. 按周分摊到 examDate 之前，最后一周留 20% 冲刺 mock
 */
export function planStudy(input: PlannerInput): { weeks: WeekAllocation[]; tasks: DailyTaskInput[] } {
  const now = new Date();
  const weeksRemaining = Math.max(1, Math.ceil((input.examDate.getTime() - now.getTime()) / (7 * 24 * 3600 * 1000)));

  // 各维度 gap，词汇 gap 用 overall gap 近似
  const gaps: Record<ModuleName, number> = {
    listening: Math.max(0, input.targets.listening - input.current.listening),
    reading: Math.max(0, input.targets.reading - input.current.reading),
    writing: Math.max(0, input.targets.writing - input.current.writing),
    speaking: Math.max(0, input.targets.speaking - input.current.speaking),
    vocab: Math.max(0, input.targets.overall - input.current.vocab),
  };

  // 难度系数：越接近 8 分越难提升
  function difficulty(currentBand: number): number {
    if (currentBand < 5) return 15;
    if (currentBand < 6) return 20;
    if (currentBand < 7) return 30;
    return 40;
  }

  const hoursNeeded: Record<ModuleName, number> = {
    listening: gaps.listening * 2 * difficulty(input.current.listening),
    reading: gaps.reading * 2 * difficulty(input.current.reading),
    writing: gaps.writing * 2 * difficulty(input.current.writing),
    speaking: gaps.speaking * 2 * difficulty(input.current.speaking),
    vocab: Math.max(15, gaps.vocab * 2 * difficulty(input.current.vocab)),
  };

  // 归一化到 weeklyHours × weeksRemaining
  const totalNeeded = Object.values(hoursNeeded).reduce((a, b) => a + b, 0);
  const budgetTotal = input.weeklyHours * weeksRemaining;
  const scale = totalNeeded > 0 ? Math.min(1, budgetTotal / totalNeeded) : 1;
  const weeklyPerModule: Record<ModuleName, number> = {
    listening: (hoursNeeded.listening * scale) / weeksRemaining,
    reading: (hoursNeeded.reading * scale) / weeksRemaining,
    writing: (hoursNeeded.writing * scale) / weeksRemaining,
    speaking: (hoursNeeded.speaking * scale) / weeksRemaining,
    vocab: (hoursNeeded.vocab * scale) / weeksRemaining,
  };

  // 若总时长不足预算，补差给词汇
  let sum = Object.values(weeklyPerModule).reduce((a, b) => a + b, 0);
  if (sum < input.weeklyHours) {
    weeklyPerModule.vocab += input.weeklyHours - sum;
  }
  // 若超过预算（gaps 极大），再按 weeklyHours 归一
  sum = Object.values(weeklyPerModule).reduce((a, b) => a + b, 0);
  if (sum > input.weeklyHours) {
    const ratio = input.weeklyHours / sum;
    (Object.keys(weeklyPerModule) as ModuleName[]).forEach((k) => {
      weeklyPerModule[k] *= ratio;
    });
  }

  // 生成周分配
  const weeks: WeekAllocation[] = [];
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);

  for (let w = 0; w < weeksRemaining; w++) {
    const start = new Date(startOfWeek);
    start.setDate(start.getDate() + w * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const hasMock = w === weeksRemaining - 1 || (w > 0 && w % 2 === 1);
    weeks.push({
      weekIndex: w,
      startDate: start,
      endDate: end,
      focus: { ...weeklyPerModule },
      hasMock,
    });
  }

  // 生成每日任务（每周 5 天学习日 + 2 天休息/复习）
  const tasks: DailyTaskInput[] = [];
  const modulesOrder: ModuleName[] = ["vocab", "reading", "listening", "writing", "speaking"];

  for (const week of weeks) {
    // 把每模块的周小时数拆到 5 天。词汇每天都做（15-30 分钟），其它模块每周 1-3 次
    for (let d = 0; d < 7; d++) {
      const day = new Date(week.startDate);
      day.setDate(day.getDate() + d);

      // 每日词汇（20-30 分钟）
      const vocabMin = Math.round((week.focus.vocab * 60) / 7);
      if (vocabMin >= 10) {
        tasks.push({
          date: day,
          module: "vocab",
          minutes: vocabMin,
          contentType: "srs",
          description: `词汇 SRS · ${vocabMin} 分钟（约 ${Math.round(vocabMin * 1.5)} 词）`,
        });
      }

      // 其它模块按轮值分配到工作日
      if (d < 5) {
        // 每天挑 1 个非词汇模块（轮流）
        const modIdx = (week.weekIndex * 5 + d) % 4;
        const mod = modulesOrder.slice(1)[modIdx];
        const perDayMinutes = Math.round((week.focus[mod] * 60) / (5 / 4)); // 每周该模块出现 5/4 次
        if (perDayMinutes >= 15) {
          tasks.push({
            date: day,
            module: mod,
            minutes: Math.min(90, perDayMinutes),
            contentType: mod === "writing" ? "task" : mod === "speaking" ? "session" : "passage",
            description: describe(mod, perDayMinutes),
          });
        }
      }

      // 周末最后一天：mock（如果本周有）
      if (d === 6 && week.hasMock) {
        tasks.push({
          date: day,
          module: "reading",
          minutes: 60,
          contentType: "mock",
          description: "周末 mini-mock：模拟真题一节，用于自适应重规划",
        });
      }
    }
  }

  return { weeks, tasks };
}

function describe(mod: ModuleName, minutes: number): string {
  const map: Record<ModuleName, (m: number) => string> = {
    vocab: (m) => `词汇 · ${m} 分钟`,
    reading: (m) =>
      m >= 60 ? "阅读 · 完整 1 篇 Passage + 复盘错题" : `阅读 · 精读 1 篇短文（${m} 分钟）`,
    listening: (m) => (m >= 45 ? "听力 · 完整 Section + 精听" : `听力 · 1 段 + 跟读（${m} 分钟）`),
    writing: (m) =>
      m >= 45 ? "写作 · 一篇 Task 2 完整练习 + AI 批改" : `写作 · 段落练习 + 模板消化（${m} 分钟）`,
    speaking: (m) =>
      m >= 30 ? "口语 · 与 AI 考官对话（P1/P2）" : `口语 · 话题练习（${m} 分钟）`,
  };
  return map[mod](minutes);
}
