import "server-only";
import { READING_SETS } from "./reading";
import { LISTENING_SETS } from "./listening";
import type { ReadingSet, ListeningSet, PoolQ } from "./types";
import voaData from "@/lib/assessment/data/voa-articles.json";
import cambridgeReadingData from "@/lib/assessment/data/cambridge-reading.json";
import cambridgeListeningData from "@/lib/assessment/data/cambridge-listening.json";

/** VOA 公有领域文章（真人 MP3 音频 + 人工编题）*/
type VoaArticle = { id: string; title: string; text: string; questions: PoolQ[] };
const VOA = voaData as VoaArticle[];

/** 剑桥真题阅读（OCR 正文 + 人工核对答案）*/
type CambridgeReading = { id: string; title: string; content: string; questions: PoolQ[] };
const CAMBRIDGE_READING = (cambridgeReadingData as CambridgeReading[]).map((s) => ({
  id: s.id,
  title: s.title,
  content: s.content,
  questions: s.questions,
}));

/** 剑桥真题听力（真人 MP3 音频 c13-*.m4a + 人工核对答案）*/
type CambridgeListening = { id: string; title: string; intro: string; questions: PoolQ[] };
const CAMBRIDGE_LISTENING: ListeningSet[] = (cambridgeListeningData as CambridgeListening[]).map((s) => ({
  id: s.id,
  title: s.title,
  lines: [{ speaker: "N", text: s.intro }],
  questions: s.questions,
}));

// VOA 作为阅读集：正文 + 题
const VOA_READING: ReadingSet[] = VOA.map((a) => ({
  id: `voa-${a.id}`,
  title: a.title,
  content: a.text,
  questions: a.questions,
}));

// VOA 作为听力集：真人音频文件 voa-<id>.m4a（poolId 即文件名）+ 原文 fallback
const VOA_LISTENING: ListeningSet[] = VOA.map((a) => ({
  id: `voa-${a.id}`,
  title: a.title,
  lines: [{ speaker: "N", text: a.text }],
  questions: a.questions,
}));

const ALL_READING = [...READING_SETS, ...VOA_READING, ...CAMBRIDGE_READING];
const ALL_LISTENING = [...LISTENING_SETS, ...VOA_LISTENING, ...CAMBRIDGE_LISTENING];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** 打乱题序 + 每题 MCQ 选项顺序（答案按 value 判分，顺序无所谓）*/
function randomizeQuestions(questions: PoolQ[]): PoolQ[] {
  return shuffle(questions).map((q) =>
    q.type === "mcq" && q.options ? { ...q, options: shuffle(q.options) } : q,
  );
}

export function pickReadingSet(): ReadingSet {
  const set = ALL_READING[Math.floor(Math.random() * ALL_READING.length)];
  return { ...set, questions: randomizeQuestions(set.questions) };
}

export function pickListeningSet(): ListeningSet {
  const set = ALL_LISTENING[Math.floor(Math.random() * ALL_LISTENING.length)];
  return { ...set, questions: randomizeQuestions(set.questions) };
}

/** 按 id 取原始题集（判分用，不打乱）*/
export function getReadingSet(id: string): ReadingSet | undefined {
  return ALL_READING.find((s) => s.id === id);
}
export function getListeningSet(id: string): ListeningSet | undefined {
  return ALL_LISTENING.find((s) => s.id === id);
}
