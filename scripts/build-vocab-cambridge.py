#!/usr/bin/env python3
"""
从剑桥英汉词典 MDX 提取释义，结合 ECDICT 词频分级，生成 vocab-bank.json。
- 词表与词频来自 ECDICT（COCA frq），只取考试词（cet/ielts/toefl/gre）。
- 释义优先用剑桥英汉词典（更权威），剑桥查不到则回退 ECDICT。
输出：lib/assessment/data/vocab-bank.json  [{word, ipa, level, meaning}]

用法：python3 scripts/build-vocab-cambridge.py
依赖：readmdict + python-lzo（brew lzo）
"""
import csv, json, re, os, sys, html

ROOT = os.path.join(os.path.dirname(__file__), "..")
MDX_PATH = "/Users/xiyu/Desktop/剑桥英汉（简体）词典/Cambridge English-Chinese (Simplified) Dictionary.mdx"
ECDICT_CSV = "/tmp/ecdict/ecdict.csv"
OUT_PATH = os.path.join(ROOT, "lib", "assessment", "data", "vocab-bank.json")

BANDS = [
    (3000, 800, 3000, 500),
    (5000, 3000, 5000, 500),
    (7000, 5000, 7000, 500),
    (8500, 7000, 11000, 500),
]
CJK = re.compile(r"[一-鿿]")
WORD_RE = re.compile(r"^[a-z]{3,14}$")


def load_cambridge():
    """返回 {word_lower: 简短中文释义}。从 MDX HTML 里抽第一个中文释义。"""
    from readmdict import MDX
    defs = {}
    for key, val in MDX(MDX_PATH).items():
        word = key.decode("utf-8").strip().lower()
        if not WORD_RE.match(word) or word in defs:
            continue
        text = val.decode("utf-8", "ignore")
        meaning = extract_cn(text)
        if meaning:
            defs[word] = meaning
    return defs


def extract_cn(html_text):
    """从词典 HTML 抽一个简短中文释义。"""
    # 去脚本/样式
    html_text = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html_text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", html_text)
    text = html.unescape(text)
    # 找中文片段
    for chunk in re.split(r"[\n\r]+", text):
        chunk = chunk.strip()
        if CJK.search(chunk) and 1 < len(chunk) <= 20 and not chunk.startswith("["):
            # 取到第一个标点前
            chunk = re.split(r"[；;。]", chunk)[0]
            parts = re.split(r"[，,、]", chunk)
            m = "，".join(parts[:2]).strip()
            m = re.sub(r"[（(].*?[)）]", "", m).strip()
            if m and CJK.search(m) and len(m) <= 14:
                return m
    return None


def ecdict_first_meaning(translation):
    if not translation:
        return None
    translation = translation.replace("\\n", "\n")
    for line in translation.split("\n"):
        line = line.strip()
        if not CJK.search(line) or line.startswith("["):
            continue
        line = re.sub(r"^[a-zA-Z]{1,5}\.\s*", "", line)
        line = re.split(r"[；;]", line)[0].strip()
        parts = re.split(r"[，,、]", line)
        m = "，".join(parts[:2]).strip()
        m = re.sub(r"[（(].*?[)）]", "", m).strip()
        if m and CJK.search(m) and len(m) <= 14:
            return m
    return None


def clean_ipa(p):
    p = (p or "").strip()
    return "/" + p + "/" if p else None


def main():
    print("加载剑桥词典 MDX ...", flush=True)
    cambridge = load_cambridge()
    print(f"  剑桥词条(有中文释义): {len(cambridge)}", flush=True)

    buckets = {level: [] for level, _, _, _ in BANDS}
    cam_used = 0
    with open(ECDICT_CSV, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            word = (row.get("word") or "").strip().lower()
            if not WORD_RE.match(word):
                continue
            try:
                frq = int(row.get("frq") or 0)
            except ValueError:
                frq = 0
            if frq <= 0:
                continue
            tag = row.get("tag") or ""
            if not any(t in tag for t in ("cet4", "cet6", "ielts", "toefl", "gre", "ky", "gk", "zk")):
                continue
            # 优先剑桥释义，回退 ECDICT
            meaning = cambridge.get(word)
            if meaning:
                cam_used += 1
            else:
                meaning = ecdict_first_meaning(row.get("translation") or "")
            if not meaning:
                continue
            for level, lo, hi, _ in BANDS:
                if lo < frq <= hi:
                    buckets[level].append({
                        "word": word, "ipa": clean_ipa(row.get("phonetic")),
                        "level": level, "meaning": meaning,
                    })
                    break

    out = []
    for level, _, _, target in BANDS:
        seen, picked = set(), []
        for it in buckets[level]:
            if it["word"] in seen:
                continue
            seen.add(it["word"])
            picked.append(it)
            if len(picked) >= target:
                break
        out.extend(picked)
        print(f"  level {level}: {len(picked)} 词", flush=True)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    json.dump(out, open(OUT_PATH, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"✓ {len(out)} 词 (剑桥释义 {cam_used} 个) → {OUT_PATH}")


if __name__ == "__main__":
    main()
