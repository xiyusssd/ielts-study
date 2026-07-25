/**
 * FSRS-4.5 简化实现（Free Spaced Repetition Scheduler）
 * 参考：https://github.com/open-spaced-repetition/fsrs4anki/wiki/Free-Spaced-Repetition-Scheduler
 *
 * 与 SM-2 相比：
 * - 用 stability（S，天）和 difficulty（D，1-10）建模每张卡的记忆状态
 * - 忽略 retrievability（R）复杂度，用简化版 5 档反馈
 * - 参数是官方 default weights (v4)
 */

export type Grade = 0 | 1 | 2 | 3 | 4;
// 0 again, 1 hard, 2 good, 3 easy, 4 perfect

export type ReviewState = {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
};

export type ReviewResult = ReviewState & {
  intervalDays: number;
  dueAt: Date;
};

// FSRS v4 官方 default weights
const W = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61,
];

const REQUEST_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 365 * 5;

/** 初始 stability（首次评级后）*/
function initStability(grade: Grade): number {
  return Math.max(0.1, W[grade === 0 ? 0 : Math.min(grade, 3)]);
}

/** 初始 difficulty（首次评级后）*/
function initDifficulty(grade: Grade): number {
  const d = W[4] - (grade - 2) * W[5];
  return clamp(d, 1, 10);
}

/** 遗忘曲线：给定天数后仍能回忆的概率 */
function retrievability(days: number, stability: number): number {
  return Math.pow(1 + days / (9 * stability), -1);
}

/** 下一次到期间隔（保留 90% 记忆概率）*/
function nextInterval(stability: number): number {
  const days = (stability / 0.9) * (Math.pow(REQUEST_RETENTION, -1 / 0.5) - 1);
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));
}

/** 更新 difficulty */
function updateDifficulty(d: number, grade: Grade): number {
  const next = d - W[6] * (grade - 3);
  return clamp(meanReversion(W[4], next), 1, 10);
}

function meanReversion(init: number, current: number): number {
  return W[7] * init + (1 - W[7]) * current;
}

/** 更新 stability（回忆成功）*/
function updateStabilityRecall(d: number, s: number, r: number, grade: Grade): number {
  const hardPenalty = grade === 1 ? W[15] : 1;
  const easyBonus = grade === 4 ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hardPenalty * easyBonus);
}

/** 更新 stability（遗忘）*/
function updateStabilityForget(d: number, s: number, r: number): number {
  return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * 核心：给定当前状态 + 用户评分，返回下次到期时间。
 * 首次学习时 state 传 { stability: 0, difficulty: 0, reps: 0, lapses: 0 }
 */
export function schedule(state: ReviewState, grade: Grade, now: Date = new Date()): ReviewResult {
  const isNew = state.reps === 0;

  let s: number;
  let d: number;
  let lapses = state.lapses;

  if (isNew) {
    s = initStability(grade);
    d = initDifficulty(grade);
  } else {
    // 计算距上次复习的天数（用 stability 的 1/e 作为最后一次到期的近似）
    // 简化：直接用 state.stability 作为上次到期时的 stability
    const elapsedDays = Math.max(0.01, state.stability); // 假设按到期时间来复习
    const r = retrievability(elapsedDays, state.stability);
    d = updateDifficulty(state.difficulty, grade);
    if (grade === 0) {
      s = updateStabilityForget(d, state.stability, r);
      lapses += 1;
    } else {
      s = updateStabilityRecall(d, state.stability, r, grade);
    }
  }

  const intervalDays = nextInterval(s);
  const dueAt = new Date(now.getTime() + intervalDays * 24 * 3600 * 1000);

  return {
    stability: s,
    difficulty: d,
    reps: state.reps + 1,
    lapses,
    intervalDays,
    dueAt,
  };
}

/** 给 UI 用的档位标签 */
export const GRADE_LABELS: Record<Grade, { label: string; hint: string; hue: string }> = {
  0: { label: "Again", hint: "完全不记得", hue: "destructive" },
  1: { label: "Hard", hint: "想起来很费劲", hue: "warning" },
  2: { label: "Good", hint: "有点犹豫但对了", hue: "primary" },
  3: { label: "Easy", hint: "毫不费力", hue: "success" },
  4: { label: "Perfect", hint: "秒答，滚瓜烂熟", hue: "success" },
};
