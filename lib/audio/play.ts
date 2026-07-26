// 发音播放（客户端）。优先播本地预生成音频(/audio/words|sentences/<slug>.m4a)，
// 没有则降级浏览器 speechSynthesis。slug 规则必须与 scripts/gen-word-audio.py 一致。

export function audioSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function fallbackTTS(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/**
 * 播放一个单词的发音。
 * @param spelling 单词拼写（用于定位音频文件 + TTS 兜底文本）
 */
export function playWord(spelling: string) {
  playFrom(`/audio/words/${audioSlug(spelling)}.m4a`, spelling, 0.9);
}

/**
 * 播放一条例句的发音。音频按该词 spelling 命名（sentences/<slug>.m4a）。
 * @param spelling 该例句所属单词的拼写（定位音频）
 * @param sentence 例句英文（TTS 兜底文本）
 */
export function playSentence(spelling: string, sentence: string) {
  playFrom(`/audio/sentences/${audioSlug(spelling)}.m4a`, sentence, 0.95);
}

function playFrom(url: string, fallbackText: string, rate: number) {
  if (typeof window === "undefined") return;
  let fellBack = false;
  const fall = () => {
    if (fellBack) return;
    fellBack = true;
    fallbackTTS(fallbackText, rate);
  };
  try {
    const audio = new Audio(url);
    audio.addEventListener("error", fall, { once: true });
    audio.play().catch(fall);
  } catch {
    fall();
  }
}
