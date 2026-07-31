// 宽松归一：去首尾空格、压缩空白、小写、去标点。用于整句判分。
export function normSentence(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'`()\[\]{}…—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 逐词对比：用 LCS(最长公共子序列)对齐，漏词/多词只标真正没答对的词，
// 不会因位移导致后面满屏红。返回每个"正确答案词"是否被答对。
export function wordDiff(answer: string, expected: string): { word: string; ok: boolean }[] {
  const a = normSentence(answer).split(" ").filter(Boolean);
  const e = normSentence(expected).split(" ").filter(Boolean);
  const n = a.length;
  const m = e.length;
  // dp[i][j] = a[0..i) 与 e[0..j) 的 LCS 长度
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] === e[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  // 回溯：标记 e 中处于 LCS 里的词为答对
  const ok = new Array(m).fill(false);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === e[j - 1]) {
      ok[j - 1] = true;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return e.map((w, k) => ({ word: w, ok: ok[k] }));
}
