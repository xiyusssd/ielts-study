#!/usr/bin/env python3
"""
抓取 VOA Learning English 公有领域文章：正文 + 真人 MP3。
公有领域许可：https://learningenglish.voanews.com/p/6861.html
输出：
  - /tmp/voa/transcripts.json  [{id,title,url,text,mp3}]
  - public/audio/listening/voa-<id>.m4a  （由 mp3 转码）
之后人工按正文编题（非 AI），写进 lib/assessment/pools。
"""
import re, json, os, html, subprocess, sys, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
AUDIO_DIR = os.path.join(ROOT, "public", "audio", "listening")
TMP = "/tmp/voa"
os.makedirs(TMP, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

# 精选说明文类文章（health/science/nature/education）
ARTICLES = [
    ("daylight", "https://learningenglish.voanews.com/a/how-daylight-savings-time-affects-health/8001173.html"),
    ("dementia", "https://learningenglish.voanews.com/a/how-to-lower-your-risk-of-dementia-starting-in-middle-age/7937612.html"),
    ("airquality", "https://learningenglish.voanews.com/a/how-to-reduce-risks-of-bad-air-quality/7980912.html"),
    ("asteroid", "https://learningenglish.voanews.com/a/methods-for-protecting-earth-against-an-asteroid-strike/7989189.html"),
    ("mars", "https://learningenglish.voanews.com/a/new-discovery-could-explain-what-gives-mars-its-red-color/7990107.html"),
    ("butterfly", "https://learningenglish.voanews.com/a/monarch-butterfly-count-nears-30-year-low/7966513.html"),
]

UA = {"User-Agent": "Mozilla/5.0"}


def fetch(url):
    # 用 curl（系统证书完好），避开 Python 3.14 的 SSL 证书问题
    return subprocess.run(
        ["curl", "-s", "-L", "--max-time", "40", "-A", "Mozilla/5.0", url],
        capture_output=True, text=True, check=True,
    ).stdout


def extract(raw):
    title_m = re.search(r"<title>([^<]*)", raw)
    title = html.unescape(title_m.group(1)).strip() if title_m else ""
    title = re.sub(r"\s*\|.*$", "", title)
    paras = re.findall(r"<p>(.*?)</p>", raw, re.S)
    clean = []
    for p in paras:
        txt = html.unescape(re.sub(r"<[^>]+>", "", p)).strip()
        if len(txt) > 40 and "learningenglish" not in txt.lower():
            clean.append(txt)
    text = "\n\n".join(clean)
    mp3_m = re.search(r"https://[^\"'&]*_hq\.mp3", raw) or re.search(r"https://[^\"'&]*\.mp3", raw)
    return title, text, (mp3_m.group(0) if mp3_m else None)


def download_audio(mp3_url, out_id):
    mp3_path = os.path.join(TMP, f"{out_id}.mp3")
    m4a_path = os.path.join(AUDIO_DIR, f"voa-{out_id}.m4a")
    subprocess.run(
        ["curl", "-s", "-L", "--max-time", "120", "-A", "Mozilla/5.0", "-o", mp3_path, mp3_url],
        check=True,
    )
    # 转 m4a（体积更小），afconvert 系统自带
    subprocess.run(["afconvert", mp3_path, m4a_path, "-f", "m4af", "-d", "aac"], check=True)
    size = os.path.getsize(m4a_path)
    os.remove(mp3_path)
    return m4a_path, size


def main():
    out = []
    for out_id, url in ARTICLES:
        try:
            raw = fetch(url)
            title, text, mp3 = extract(raw)
            words = len(text.split())
            audio_ok = False
            if mp3:
                try:
                    _, size = download_audio(mp3, out_id)
                    audio_ok = True
                    print(f"✓ {out_id}: {words} 词 · 音频 {size//1024}KB · {title[:50]}")
                except Exception as exc:
                    print(f"! {out_id}: 正文OK({words}词) 但音频失败 {str(exc)[:50]}")
            else:
                print(f"! {out_id}: 无 mp3 链接")
            out.append({"id": out_id, "title": title, "url": url, "text": text, "words": words, "mp3": mp3, "audio": audio_ok})
        except Exception as exc:
            print(f"✗ {out_id}: {str(exc)[:80]}")
    with open(os.path.join(TMP, "transcripts.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print(f"\n✓ {len(out)} 篇 → {TMP}/transcripts.json · 音频 → {AUDIO_DIR}")


if __name__ == "__main__":
    main()
