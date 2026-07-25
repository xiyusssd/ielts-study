/**
 * 为「评估听力」题库预生成清晰音频（离线，用 macOS say + afconvert）。
 * 每段脚本按说话人分句，不同角色用不同声音；合并为单个 m4a。
 * 产物：public/audio/listening/<setId>.m4a
 *
 * 用法：
 *   PATH=~/.local/node22/bin:$PATH ./node_modules/.bin/tsx scripts/gen-assessment-audio.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LISTENING_SETS } from "../lib/assessment/pools/listening";
import type { ListeningSet } from "../lib/assessment/pools/types";

const OUT_DIR = join(process.cwd(), "public", "audio", "listening");
const SAMPLE_RATE = 22050;
const VOICE: Record<string, string> = { W: "Samantha", M: "Daniel", N: "Alex" };

const log = (msg: string) => console.log(`\x1b[36m→\x1b[0m ${msg}`);
const ok = (msg: string) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);

function pcmData(wavPath: string): Buffer {
  return readFileSync(wavPath).subarray(44); // 去掉 44 字节 PCM 头
}

function silencePcm(ms: number): Buffer {
  return Buffer.alloc(Math.floor((SAMPLE_RATE * ms) / 1000) * 2);
}

function writeWav(pcm: Buffer, outPath: string) {
  const header = Buffer.alloc(44);
  const dataLen = pcm.length;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLen, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLen, 40);
  writeFileSync(outPath, Buffer.concat([header, pcm]));
}

function genSet(set: ListeningSet, tmp: string) {
  const parts: Buffer[] = [];
  set.lines.forEach((line, idx) => {
    const voice = VOICE[line.speaker] ?? "Samantha";
    const wav = join(tmp, `${set.id}-${idx}.wav`);
    execFileSync("say", [
      "-v", voice,
      "-o", wav,
      "--file-format=WAVE",
      "--data-format=LEI16@22050",
      line.text,
    ]);
    parts.push(pcmData(wav));
    parts.push(silencePcm(650)); // 句间停顿
    rmSync(wav, { force: true });
  });
  const combinedWav = join(tmp, `${set.id}.wav`);
  writeWav(Buffer.concat(parts), combinedWav);
  const outM4a = join(OUT_DIR, `${set.id}.m4a`);
  execFileSync("afconvert", [combinedWav, outM4a, "-f", "m4af", "-d", "aac"]);
  rmSync(combinedWav, { force: true });
  return outM4a;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const tmp = join(tmpdir(), `ielts-audio-${Date.now()}`);
  mkdirSync(tmp, { recursive: true });
  log(`生成 ${LISTENING_SETS.length} 段听力音频 → ${OUT_DIR}`);
  for (const set of LISTENING_SETS) {
    const out = genSet(set, tmp);
    ok(`${set.id} · ${set.lines.length} 句 → ${out.split("/").pop()}`);
  }
  rmSync(tmp, { recursive: true, force: true });
  ok("全部完成");
}

main();
