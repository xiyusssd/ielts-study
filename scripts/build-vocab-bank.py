#!/usr/bin/env python3
"""从 ECDICT 生成打包用词库 JSON（公开版，仅开源数据，无 AI）。

三维分类 schema：{word, ipa, meaning, pos, cefr, level, freq, sources[], topics[]}
- sources: 词汇书来源(cet4/cet6/ielts/toefl/gre/kaoyan/gaokao/zhongkao/awl)
- topics : 雅思话题(从剑桥阅读语料提取，见 build-topic-map.py；未命中为空)
- cefr   : 真实难度带(A1-C2，按 COCA 词频)
- level  : 旧的 3000/5000/7000/8500 分位标签(向后兼容)

选词 = 前 1 万高频词 ∪ 所有考试标签词，去重。约 1.5 万词。
用法：python3 scripts/build-vocab-bank.py [/tmp/ecdict/ecdict.csv]
"""
import os, sys
import vocab_common as vc

HERE = os.path.dirname(__file__)
CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ecdict/ecdict.csv"
OUT_PATH = os.path.join(HERE, "..", "lib", "assessment", "data", "vocab-bank.json")
TOPIC_MAP = os.path.join(HERE, "..", "lib", "assessment", "data", "topic-map.json")
AWL_PATH = os.path.join(HERE, "..", "content", "wordlists", "awl.txt")


def main():
    entries = list(vc.iter_ecdict(CSV_PATH))
    topic_map = vc.load_topic_map(TOPIC_MAP)
    awl = vc.load_awl(AWL_PATH)
    out = vc.build_and_write(entries, topic_map, awl, OUT_PATH)
    vc.report(out, "(公开版 ECDICT 释义)")
    print(f"→ {OUT_PATH}")


if __name__ == "__main__":
    main()
