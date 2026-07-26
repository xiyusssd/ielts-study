#!/usr/bin/env python3
"""词库构建共享模块：ECDICT 读取、词性/CEFR/来源/话题的分类逻辑。

build-vocab-bank.py(公开,ECDICT-only) 与 build-vocab-cambridge.py(本地,+剑桥释义)
都 import 本模块，保证两版产出同一 schema：
  {word, ipa, meaning, pos, cefr, freq, sources[], topics[]}

无 AI，纯规则。ECDICT 的 pos 列实测 0% 填充，词性从 translation 词性前缀解析。
"""
import csv, re, os, json

CJK = re.compile(r"[一-鿿]")
WORD_RE = re.compile(r"^[a-z]{3,14}$")

# translation 首行词性缩写 → 规范词性
_POS_MAP = {
    "n": "noun", "vt": "verb", "vi": "verb", "v": "verb",
    "adj": "adj", "a": "adj", "adv": "adv", "ad": "adv",
    "prep": "prep", "conj": "conj", "pron": "pron",
    "art": "art", "int": "int", "num": "num", "aux": "verb",
}
_POS_PREFIX = re.compile(r"^\s*\[?([a-zA-Z]{1,4})\.")

# ECDICT tag token → 词汇书来源(规范英文 key)
_SOURCE_MAP = {
    "zk": "zhongkao", "gk": "gaokao", "ky": "kaoyan",
    "cet4": "cet4", "cet6": "cet6",
    "ielts": "ielts", "toefl": "toefl", "gre": "gre",
}

# COCA frq(排名，越小越高频) → CEFR 难度带
def freq_to_cefr(frq):
    if frq <= 0:
        return "C2"
    if frq <= 1000:
        return "A1"
    if frq <= 2000:
        return "A2"
    if frq <= 4000:
        return "B1"
    if frq <= 7000:
        return "B2"
    if frq <= 12000:
        return "C1"
    return "C2"


def parse_pos(translation):
    """从 ECDICT translation 首个中文行的词性前缀解析规范词性。"""
    if not translation:
        return None
    for line in translation.replace("\\n", "\n").split("\n"):
        line = line.strip()
        if not CJK.search(line):
            continue
        m = _POS_PREFIX.match(line)
        if m:
            return _POS_MAP.get(m.group(1).lower())
        return None
    return None


def parse_sources(tag):
    """ECDICT tag 列(空格分隔) → 规范来源列表。"""
    if not tag:
        return []
    out = []
    for tok in tag.split():
        key = _SOURCE_MAP.get(tok.strip().lower())
        if key and key not in out:
            out.append(key)
    return out


def first_meaning(translation, max_len=14):
    """取首个简短中文释义，去词性前缀/括注/例子。"""
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
        meaning = "，".join(parts[:2]).strip()
        meaning = re.sub(r"[（(].*?[)）]", "", meaning).strip()
        if meaning and CJK.search(meaning) and len(meaning) <= max_len:
            return meaning
    return None


def clean_ipa(phonetic):
    phonetic = (phonetic or "").strip()
    return "/" + phonetic + "/" if phonetic else None


def load_topic_map(path):
    """word(lower) → topics[]，来自 build-topic-map.py 产物。缺失返回空 dict。"""
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def load_awl(path):
    """AWL 词族清单(每行一词) → set。缺失返回空 set。"""
    if not os.path.exists(path):
        return set()
    words = set()
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            w = line.strip().lower()
            if WORD_RE.match(w):
                words.add(w)
    return words


def iter_ecdict(csv_path):
    """逐行产出 ECDICT 词条 dict（已过滤为合法单词、有词频、有释义）。
    yield: {word, ipa, meaning, pos, freq, sources}
    调用方负责去重、话题 join、CEFR、扩词并集与排序。
    """
    seen = set()
    with open(csv_path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            word = (row.get("word") or "").strip().lower()
            if not WORD_RE.match(word) or word in seen:
                continue
            try:
                frq = int(row.get("frq") or 0)
            except ValueError:
                frq = 0
            translation = row.get("translation") or ""
            meaning = first_meaning(translation)
            if not meaning:
                continue
            seen.add(word)
            yield {
                "word": word,
                "ipa": clean_ipa(row.get("phonetic")),
                "meaning": meaning,
                "pos": parse_pos(translation),
                "freq": frq,
                "sources": parse_sources(row.get("tag") or ""),
            }


TOP_FREQ = 10000                       # 高频取前 1 万
TIER_LABELS = [3000, 5000, 7000, 8500]  # 旧 level 分位标签(向后兼容)


def select(entries):
    """选词并集：前 TOP_FREQ 高频 ∪ 有考试来源标签的词。约 1.5 万。"""
    with_freq = sorted([e for e in entries if e["freq"] > 0], key=lambda e: e["freq"])
    picked, seen = [], set()
    for e in with_freq[:TOP_FREQ]:
        picked.append(e)
        seen.add(e["word"])
    for e in entries:
        if e["sources"] and e["word"] not in seen:
            picked.append(e)
            seen.add(e["word"])
    return picked


def build_and_write(entries, topic_map, awl, out_path):
    """给每条打 cefr/topics/awl，选词，赋旧 level，写出统一 schema JSON。返回 out list。"""
    for e in entries:
        e["topics"] = topic_map.get(e["word"], [])
        if e["word"] in awl and "awl" not in e["sources"]:
            e["sources"] = e["sources"] + ["awl"]
        e["cefr"] = freq_to_cefr(e["freq"])
    picked = select(entries)
    ranked = sorted([e for e in picked if e["freq"] > 0], key=lambda e: e["freq"])
    per = max(1, len(ranked) // 4)
    for i, e in enumerate(ranked):
        e["level"] = TIER_LABELS[min(i // per, 3)]
    for e in picked:
        e.setdefault("level", 8500)
    out = [{
        "word": e["word"], "ipa": e["ipa"], "meaning": e["meaning"],
        "pos": e["pos"], "cefr": e["cefr"], "level": e["level"],
        "freq": e["freq"], "sources": e["sources"], "topics": e["topics"],
    } for e in picked]
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return out


def report(out, extra=""):
    from collections import Counter
    src = Counter(s for e in out for s in e["sources"])
    cefr = Counter(e["cefr"] for e in out)
    topics = sum(1 for e in out if e["topics"])
    print(f"✓ {len(out)} 词 {extra}")
    print(f"  来源: {dict(src)}")
    print(f"  CEFR: {dict(sorted(cefr.items()))}")
    print(f"  有话题标签: {topics} 词")
