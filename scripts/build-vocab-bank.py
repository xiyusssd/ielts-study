#!/usr/bin/env python3
"""
从 ECDICT (ecdict.csv) 生成打包用的词库 JSON。
按 COCA 词频 (frq) 分到 4 个频率带 3000/5000/7000/8500，每带取若干词。
输出：lib/assessment/data/vocab-bank.json — [{word, ipa, level, meaning}]
仅公开开源数据，无 AI。

用法：python3 scripts/build-vocab-bank.py /tmp/ecdict/ecdict.csv
"""
import csv, json, re, sys, os

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ecdict/ecdict.csv"
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "lib", "assessment", "data", "vocab-bank.json")

# 频率带：(level, frq 下限, frq 上限, 目标词数)
BANDS = [
    (3000, 800, 3000, 500),
    (5000, 3000, 5000, 500),
    (7000, 5000, 7000, 500),
    (8500, 7000, 11000, 500),
]

CJK = re.compile(r"[一-鿿]")
WORD_RE = re.compile(r"^[a-z]{3,14}$")


def first_meaning(translation):
    """取首个中文释义，去掉词性前缀与例子，控制长度。"""
    if not translation:
        return None
    # ECDICT translation 用字面 "\n"(反斜杠+n) 和真实换行两种都可能，统一切分
    translation = translation.replace("\\n", "\n")
    for line in translation.split("\n"):
        line = line.strip()
        if not CJK.search(line):
            continue
        # 跳过领域标注行如 "[计] ..." "[医] ..."
        if line.startswith("["):
            continue
        # 去掉开头词性如 "n. " "vt. " "a. "
        line = re.sub(r"^[a-zA-Z]{1,5}\.\s*", "", line)
        # 只取第一个分号/逗号前的主释义，控制长度
        line = re.split(r"[；;]", line)[0].strip()
        parts = re.split(r"[，,、]", line)
        meaning = "，".join(parts[:2]).strip()
        meaning = re.sub(r"[（(].*?[)）]", "", meaning).strip()
        if meaning and CJK.search(meaning) and len(meaning) <= 14:
            return meaning
    return None


def clean_ipa(phonetic):
    phonetic = (phonetic or "").strip()
    if not phonetic:
        return None
    return "/" + phonetic + "/"


def main():
    buckets = {level: [] for level, _, _, _ in BANDS}
    with open(CSV_PATH, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            word = (row.get("word") or "").strip().lower()
            if not WORD_RE.match(word):
                continue
            try:
                frq = int(row.get("frq") or 0)
            except ValueError:
                frq = 0
            if frq <= 0:
                continue
            meaning = first_meaning(row.get("translation") or "")
            if not meaning:
                continue
            # 优先收考试词汇（cet/ielts/toefl/gre/ky），排除专有/计算机等生僻
            tag = row.get("tag") or ""
            if not any(t in tag for t in ("cet4", "cet6", "ielts", "toefl", "gre", "ky", "gk", "zk")):
                continue
            for level, lo, hi, _ in BANDS:
                if lo < frq <= hi:
                    buckets[level].append({
                        "word": word,
                        "ipa": clean_ipa(row.get("phonetic")),
                        "level": level,
                        "meaning": meaning,
                    })
                    break

    out = []
    for level, _, _, target in BANDS:
        items = buckets[level]
        # 按 frq 已隐含顺序；直接截断到目标数（词已足够多）
        seen = set()
        picked = []
        for it in items:
            if it["word"] in seen:
                continue
            seen.add(it["word"])
            picked.append(it)
            if len(picked) >= target:
                break
        out.extend(picked)
        print(f"  level {level}: {len(picked)} 词 (候选 {len(items)})")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"✓ 写出 {len(out)} 词 → {OUT_PATH}")


if __name__ == "__main__":
    main()
