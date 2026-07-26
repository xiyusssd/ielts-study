#!/usr/bin/env python3
"""
用 Piper (开源 TTS, LJSpeech 公有领域音色) 批量生成单词 + 例句发音。
产物：public/audio/words/<slug>.m4a、public/audio/sentences/<slug>.m4a
- slug = spelling 小写、非字母数字转 _（前端播放层用同一规则）
- 幂等：已存在的 m4a 跳过，可中断重跑
- wav 由 piper 生成后 afconvert 转 AAC/m4a（~11KB/词）

用法: python3 scripts/gen-word-audio.py [--limit N]
依赖: pip install piper-tts；模型在 ~/.local/share/piper-voices/ljspeech.onnx
"""
import os, re, sys, wave, sqlite3, subprocess, json, tempfile, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "prisma", "dev.db")
MODEL = os.path.expanduser("~/.local/share/piper-voices/ljspeech.onnx")
WORDS_DIR = os.path.join(ROOT, "public", "audio", "words")
SENT_DIR = os.path.join(ROOT, "public", "audio", "sentences")

def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", s.strip().lower()).strip("_")

def to_m4a(voice, text, out_path, tmp_wav):
    with wave.open(tmp_wav, "wb") as wf:
        voice.synthesize_wav(text, wf)
    # afconvert wav -> m4a (AAC 64kbps)
    r = subprocess.run(
        ["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", tmp_wav, out_path],
        capture_output=True,
    )
    return r.returncode == 0

def main():
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    if not os.path.exists(MODEL):
        print(f"✗ 模型不存在: {MODEL}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(WORDS_DIR, exist_ok=True)
    os.makedirs(SENT_DIR, exist_ok=True)

    from piper import PiperVoice
    print("加载模型...")
    voice = PiperVoice.load(MODEL)

    con = sqlite3.connect(DB)
    rows = con.execute("SELECT spelling, examples FROM Word ORDER BY spelling").fetchall()
    con.close()
    if limit:
        rows = rows[:limit]

    total = len(rows)
    print(f"共 {total} 词，开始生成…")
    tmp_wav = os.path.join(tempfile.gettempdir(), f"piper-gen-{os.getpid()}.wav")

    w_done = w_skip = s_done = s_skip = fail = 0
    t0 = time.time()
    for i, (spelling, examples_json) in enumerate(rows):
        sl = slug(spelling)
        if not sl:
            continue
        # 单词
        wp = os.path.join(WORDS_DIR, f"{sl}.m4a")
        if os.path.exists(wp) and os.path.getsize(wp) > 0:
            w_skip += 1
        else:
            if to_m4a(voice, spelling, wp, tmp_wav):
                w_done += 1
            else:
                fail += 1
        # 例句（取第一条 en）
        try:
            ex = json.loads(examples_json or "[]")
        except Exception:
            ex = []
        if ex and ex[0].get("en"):
            sp = os.path.join(SENT_DIR, f"{sl}.m4a")
            if os.path.exists(sp) and os.path.getsize(sp) > 0:
                s_skip += 1
            else:
                if to_m4a(voice, ex[0]["en"], sp, tmp_wav):
                    s_done += 1
                else:
                    fail += 1
        if (i + 1) % 200 == 0 or i + 1 == total:
            dt = time.time() - t0
            print(f"  {i+1}/{total} · 词新{w_done}/跳{w_skip} 句新{s_done}/跳{s_skip} 失败{fail} · {dt:.0f}s")

    if os.path.exists(tmp_wav):
        os.remove(tmp_wav)
    print(f"✓ 完成：单词音频 {w_done} 新增 / {w_skip} 已存在；例句 {s_done} 新增；失败 {fail}")

if __name__ == "__main__":
    main()
