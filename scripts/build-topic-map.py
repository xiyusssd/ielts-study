#!/usr/bin/env python3
"""从剑桥阅读语料(cambridge-reading.json)提取「单词 → 雅思话题」映射。

48 篇文章按标题人工归到 12 个雅思标准话题(写死在 TOPIC_BY_ID)。
每篇正文提取实义词，与该篇话题关联。出现在过多话题(>MAX_SPREAD)的词视为
通用词丢弃。产物 lib/assessment/data/topic-map.json: {word: [topics]}。

限制：只有出现在剑桥文章里的实义词才有话题标签，其余词库条目 topics 为空。
真实语料驱动，无 AI。
用法：python3 scripts/build-topic-map.py
"""
import json, os, re, collections

HERE = os.path.dirname(__file__)
READING = os.path.join(HERE, "..", "lib", "assessment", "data", "cambridge-reading.json")
OUT = os.path.join(HERE, "..", "lib", "assessment", "data", "topic-map.json")

MAX_SPREAD = 3       # 一个词出现在 >3 个话题 → 通用词，丢弃
MIN_LEN = 5          # 实义词最短长度
MIN_COUNT_IN_DOC = 1 # 篇内至少出现次数

TOPIC_BY_ID = {
    "c13-t1-p1": ["business", "technology"], "c13-t1-p2": ["psychology"],
    "c13-t1-p3": ["technology", "art"], "c13-t2-p1": ["history_culture", "business"],
    "c13-t2-p2": ["health", "psychology"], "c13-t2-p3": ["business"],
    "c13-t3-p1": ["nature"], "c13-t3-p2": ["education", "psychology"],
    "c13-t3-p3": ["history_culture"], "c13-t4-p1": ["history_culture"],
    "c13-t4-p2": ["environment"], "c13-t4-p3": ["psychology", "business"],
    "c14-t1-p1": ["education"], "c14-t1-p2": ["city_transport", "environment"],
    "c14-t1-p3": ["business"], "c14-t2-p1": ["art", "history_culture"],
    "c14-t2-p2": ["city_transport", "technology"], "c14-t2-p3": ["business"],
    "c14-t3-p1": ["psychology"], "c14-t3-p2": ["nature", "health"],
    "c14-t3-p3": ["education", "psychology"], "c14-t4-p1": ["health", "nature"],
    "c14-t4-p2": ["nature", "environment"], "c14-t4-p3": ["environment"],
    "c15-t1-p1": ["history_culture", "nature"], "c15-t1-p2": ["technology", "city_transport"],
    "c15-t1-p3": ["society"], "c15-t2-p1": ["city_transport", "art"],
    "c15-t2-p2": ["nature", "science"], "c15-t2-p3": ["psychology"],
    "c15-t3-p1": ["art"], "c15-t3-p2": ["technology", "environment"],
    "c15-t3-p3": ["society", "art"], "c15-t4-p1": ["environment", "nature"],
    "c15-t4-p2": ["society", "history_culture"], "c15-t4-p3": ["environment", "business"],
    "c16-t1-p1": ["environment", "nature"], "c16-t1-p2": ["history_culture"],
    "c16-t1-p3": ["business", "technology"], "c16-t2-p1": ["history_culture"],
    "c16-t2-p2": ["health", "science"], "c16-t2-p3": ["psychology"],
    "c16-t3-p1": ["history_culture"], "c16-t3-p2": ["environment", "history_culture"],
    "c16-t3-p3": ["nature", "science"], "c16-t4-p1": ["history_culture"],
    "c16-t4-p2": ["society"], "c16-t4-p3": ["technology"],
}

STOP = set("""about above after again against because before being below between both
during each from further having house into itself more most other over same some such
than that their them then there these they this those through under until very were what
when where which while whom would your yours about could should where there their been
also would were which their these those thing things about many much some very more most
often usually always never sometimes however therefore although though because since while
whereas whether either neither example including such like unlike within without across
around toward towards among against upon onto still even just only than then them they
this that with have will your from were what when which would could should about their
people number using used uses different several various certain particular general common
important possible especially probably actually really simply mainly largely mostly quite
rather almost nearly perhaps maybe indeed itself themselves being does done doing having
another others something someone anything everything nothing where there here their they""".split())


def tokens(text):
    for w in re.findall(r"[a-z]{%d,}" % MIN_LEN, text.lower()):
        if w not in STOP:
            yield w


def main():
    data = json.load(open(READING, encoding="utf-8"))
    word_topics = collections.defaultdict(set)
    docs = 0
    for p in data:
        topics = TOPIC_BY_ID.get(p["id"])
        if not topics:
            continue
        docs += 1
        counts = collections.Counter(tokens(p.get("content", "")))
        for w, c in counts.items():
            if c >= MIN_COUNT_IN_DOC:
                for t in topics:
                    word_topics[w].add(t)

    out = {}
    for w, ts in word_topics.items():
        if len(ts) <= MAX_SPREAD:
            out[w] = sorted(ts)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    dist = collections.Counter(t for ts in out.values() for t in ts)
    print(f"✓ {docs} 篇 → {len(out)} 词有话题标签")
    print(f"  话题分布: {dict(sorted(dist.items(), key=lambda x: -x[1]))}")
    print(f"→ {OUT}")


if __name__ == "__main__":
    main()
